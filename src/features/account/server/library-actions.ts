"use server";

import "server-only";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { getOptionalUser, requireUser } from "@/features/auth/server/server";
import { checkRateLimitAsync } from "@/infrastructure/security/rate-limiter";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { isMovieId } from "@/infrastructure/tmdb/movies";
import { getMovieDetails } from "@/infrastructure/tmdb/server";
import type { MovieDetails } from "@/infrastructure/tmdb/types";
import {
  EMPTY_MOVIE_LIBRARY,
  isDiaryDate,
  isMovieLibraryKind,
  type DiaryLogResult,
  type MovieLibraryKind,
  type MovieLibraryResult,
  type MovieLibraryState,
} from "../lib/library";
import { movieSnapshot } from "@/infrastructure/tmdb/snapshot";

type Client = Awaited<ReturnType<typeof createServerSupabaseClient>>;

const KEYS = { onConflict: "account_id,tmdb_id", ignoreDuplicates: true };
const HEAD = { count: "exact", head: true } as const;

const succeed = (state: MovieLibraryState): MovieLibraryResult => ({
  state,
  success: true,
});
const fail = (error: string): MovieLibraryResult => ({ error, success: false });

async function readState(
  client: Client,
  accountId: string,
  tmdbId: number,
): Promise<MovieLibraryState> {
  const [liked, watched, watchlist] = await Promise.all([
    client
      .from("account_likes")
      .select("tmdb_id", HEAD)
      .eq("account_id", accountId)
      .eq("tmdb_id", tmdbId),
    client
      .from("account_watched")
      .select("tmdb_id", HEAD)
      .eq("account_id", accountId)
      .eq("tmdb_id", tmdbId),
    client
      .from("account_watchlist")
      .select("tmdb_id", HEAD)
      .eq("account_id", accountId)
      .eq("tmdb_id", tmdbId),
  ]);

  for (const result of [liked, watched, watchlist]) {
    if (result.error) throw result.error;
  }

  return {
    liked: (liked.count ?? 0) > 0,
    watched: (watched.count ?? 0) > 0,
    watchlist: (watchlist.count ?? 0) > 0,
  };
}

function add(
  client: Client,
  accountId: string,
  tmdbId: number,
  kind: MovieLibraryKind,
  movie: MovieDetails,
) {
  const row = {
    account_id: accountId,
    tmdb_id: tmdbId,
    ...movieSnapshot(movie),
  };

  switch (kind) {
    case "liked":
      return client.from("account_likes").upsert(row, KEYS);
    case "watched":
      return client.from("account_watched").upsert(row, KEYS);
    case "watchlist":
      return client.from("account_watchlist").upsert(row, KEYS);
  }
}

function remove(
  client: Client,
  accountId: string,
  tmdbId: number,
  kind: MovieLibraryKind,
) {
  switch (kind) {
    case "liked":
      return client
        .from("account_likes")
        .delete()
        .eq("account_id", accountId)
        .eq("tmdb_id", tmdbId);
    case "watched":
      return client
        .from("account_watched")
        .delete()
        .eq("account_id", accountId)
        .eq("tmdb_id", tmdbId);
    case "watchlist":
      return client
        .from("account_watchlist")
        .delete()
        .eq("account_id", accountId)
        .eq("tmdb_id", tmdbId);
  }
}

export async function getMovieLibraryAction(
  tmdbId: number,
): Promise<MovieLibraryResult> {
  try {
    if (!isMovieId(tmdbId)) return fail("Invalid movie");

    const user = await getOptionalUser();
    if (!user) return succeed(EMPTY_MOVIE_LIBRARY);

    const client = await createServerSupabaseClient();
    return succeed(await readState(client, user.id, tmdbId));
  } catch (error) {
    report("MovieLibrary read", error);
    return fail(
      toUserMessage(error, { fallback: "Could not load your library" }),
    );
  }
}

export async function setMovieLibraryAction(
  tmdbId: number,
  kind: MovieLibraryKind,
  active: boolean,
): Promise<MovieLibraryResult> {
  try {
    if (!isMovieId(tmdbId) || !isMovieLibraryKind(kind)) {
      return fail("Invalid request");
    }

    const user = await requireUser();
    const limit = await checkRateLimitAsync(`library:${user.id}`, {
      limit: 120,
      windowMs: 60 * 1000,
    });
    if (!limit.success) return fail("Too many requests, slow down a little");

    let movie: MovieDetails | null = null;
    if (active) {
      const result = await getMovieDetails(tmdbId);
      if (!result.success) return fail("Could not load this movie, try again");
      movie = result.data;
    }

    const client = await createServerSupabaseClient();
    const { error } = movie
      ? await add(client, user.id, tmdbId, kind, movie)
      : await remove(client, user.id, tmdbId, kind);
    if (error) throw error;

    return succeed(await readState(client, user.id, tmdbId));
  } catch (error) {
    report("MovieLibrary write", error);
    return fail(
      toUserMessage(error, { fallback: "Could not update your library" }),
    );
  }
}

export async function logMovieToDiaryAction(
  tmdbId: number,
  watchedOn: string,
): Promise<DiaryLogResult> {
  try {
    if (!isMovieId(tmdbId) || !isDiaryDate(watchedOn)) {
      return { error: "Invalid request", success: false };
    }

    const user = await requireUser();
    const limit = await checkRateLimitAsync(`diary:${user.id}`, {
      limit: 60,
      windowMs: 60 * 1000,
    });
    if (!limit.success) {
      return { error: "Too many requests, slow down a little", success: false };
    }

    const result = await getMovieDetails(tmdbId);
    if (!result.success) {
      return { error: "Could not load this movie, try again", success: false };
    }

    const { backdrop_path, poster_path, release_date, title } = movieSnapshot(
      result.data,
    );

    const client = await createServerSupabaseClient();
    const { error } = await client.from("account_diary").insert({
      account_id: user.id,
      backdrop_path,
      poster_path,
      release_date,
      title,
      tmdb_id: tmdbId,
      watched_on: watchedOn,
    });

    if (error) {
      if (error.message.includes("DIARY_DATE_IN_FUTURE")) {
        return {
          error: "You cannot log a movie in the future",
          success: false,
        };
      }
      if (error.message.includes("DIARY_DATE_BEFORE_LATEST_ENTRY")) {
        return {
          error: "This movie is already logged on a later day",
          success: false,
        };
      }
      throw error;
    }

    return { success: true };
  } catch (error) {
    report("MovieDiary write", error);
    return {
      error: toUserMessage(error, { fallback: "Could not log this movie" }),
      success: false,
    };
  }
}
