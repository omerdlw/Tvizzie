import "server-only";

import { cache } from "react";
import type { Result } from "@omerdlw/base-framework/result";
import {
  getMovieDetails,
  getMovieList,
  getTrendingMovies,
} from "@/infrastructure/tmdb/server";
import type {
  FeaturedMovie,
  FeaturedMoviePage,
  TmdbError,
} from "@/infrastructure/tmdb/types";
import { fresh, fuse, loglineOf, yearOf } from "../lib/rank";
import type {
  Circle,
  Feature,
  HomeFeed,
  HomeFilm,
  HomeMember,
  Member,
  Picks,
  ShowingFilm,
} from "../lib/types";
import {
  getCircle,
  getPulse,
  getWaiting,
  type CircleRow,
  type FilmRow,
  type MemberRow,
  type PulseRow,
} from "./social";

const FEATURES = 5;
const ROW = 16;
const SHOWING = 12;
const RISING = 8;
const MEMBERS = 6;
const SEEDS = 3;
const THEATRES_MIN_VOTES = 25;

const results = (
  outcome: Result<FeaturedMoviePage, TmdbError>,
): FeaturedMovie[] => (outcome.success ? outcome.data.results : []);

const toMember = (row: MemberRow): Member => ({
  avatarUrl: row.avatar_url,
  displayName: row.display_name || row.username,
  username: row.username,
});

const toFilm = (row: FilmRow): HomeFilm => ({
  backdropPath: row.backdrop_path ?? null,
  id: row.tmdb_id,
  posterPath: row.poster_path,
  title: row.title,
  year: yearOf(row.release_date),
});

const fromTmdb = (movie: FeaturedMovie): HomeFilm => ({
  backdropPath: movie.backdropPath,
  id: movie.id,
  posterPath: movie.posterPath,
  title: movie.title,
  year: movie.releaseYear,
});

const isoDate = (time: number) => new Date(time).toISOString().slice(0, 10);

function distinct(movies: readonly FeaturedMovie[]): FeaturedMovie[] {
  const seen = new Set<number>();
  return movies.filter((movie) => {
    if (seen.has(movie.id)) return false;
    seen.add(movie.id);
    return true;
  });
}

// The hero: what the world is watching (TMDB's weekly trending) and what
// members are watching (the pulse's popular list), fused by rank. A film on
// both lists rises above the leader of either.
async function getFeatures(
  trending: FeaturedMovie[],
  pulse: PulseRow,
): Promise<Feature[]> {
  type Candidate = {
    backdropPath: string | null;
    id: number;
    social: PulseRow["popular"][number] | null;
    trending: number | null;
  };
  const world: Candidate[] = trending.map((movie, rank) => ({
    backdropPath: movie.backdropPath,
    id: movie.id,
    social: null,
    trending: rank + 1,
  }));
  const members: Candidate[] = pulse.popular.map((film) => ({
    backdropPath: film.backdrop_path ?? null,
    id: film.tmdb_id,
    social: film,
    trending: null,
  }));
  const ranked = fuse([world, members], (film) => film.id)
    .map(({ item }) => ({
      ...item,
      social:
        item.social ?? members.find((m) => m.id === item.id)?.social ?? null,
      trending:
        item.trending ?? world.find((w) => w.id === item.id)?.trending ?? null,
    }))
    .filter((film) => film.backdropPath)
    .slice(0, FEATURES + 2);

  const details = await Promise.all(
    ranked.map((film) => getMovieDetails(film.id)),
  );
  return ranked
    .flatMap<Feature>((film, i) => {
      const outcome = details[i]!;
      if (!outcome.success) return [];
      const movie = outcome.data;
      const backdropPath = movie.backdropPath ?? film.backdropPath;
      if (!backdropPath) return [];
      return [
        {
          backdropPath,
          genres: movie.genres.slice(0, 3).map((genre) => genre.name),
          id: movie.id,
          logline: loglineOf(movie.overview),
          posterPath: movie.posterPath,
          runtime: movie.runtimeMinutes,
          social: film.social
            ? {
                faces: film.social.faces.map(toMember),
                rating: film.social.rating,
                watchers: film.social.members,
              }
            : null,
          title: movie.title,
          trending: film.trending,
          year: movie.releaseYear,
        },
      ];
    })
    .slice(0, FEATURES);
}

// "Picked for you": TMDB's recommendations for the films the viewer rated
// four stars or more or liked lately, fused by rank across those seeds, less
// everything the viewer has already watched.
async function getPicks(circle: CircleRow): Promise<Picks | null> {
  const seeds = circle.seeds.slice(0, SEEDS);
  if (seeds.length === 0) return null;
  const details = await Promise.all(
    seeds.map((seed) => getMovieDetails(seed.tmdb_id)),
  );
  const seen = new Set([...circle.seen, ...circle.seeds.map((s) => s.tmdb_id)]);
  const lists = details.map((outcome) =>
    outcome.success
      ? outcome.data.recommendations.filter(
          (movie) => movie.posterPath && !seen.has(movie.id),
        )
      : [],
  );
  const films = fuse(lists, (movie) => movie.id, 10)
    .slice(0, ROW)
    .map(({ item }) => ({
      backdropPath: item.backdropPath,
      id: item.id,
      posterPath: item.posterPath,
      title: item.title,
      year: item.releaseYear,
    }));
  if (films.length < 4) return null;
  const lead = seeds.find((_, i) => lists[i]!.length > 0) ?? seeds[0]!;
  return { because: lead.title, films };
}

function getMembers(pulse: PulseRow, circle: CircleRow | null): HomeMember[] {
  const self = circle?.viewer.username ?? null;
  const suggested: HomeMember[] = (circle?.suggested ?? []).map((row) => ({
    ...toMember(row),
    bio: row.bio,
    followers: row.followers,
    id: row.id,
    reason: `Followed by ${row.mutual} you follow`,
    reviews: row.reviews,
    watched: row.watched,
  }));
  const followed = new Set(circle?.followed ?? []);
  const reviewers: HomeMember[] = pulse.reviewers
    .filter((row) => row.username !== self && !followed.has(row.id))
    .map((row) => ({
      ...toMember(row),
      bio: row.bio,
      followers: row.followers,
      id: row.id,
      reason: `${row.likes.toLocaleString("en-US")} likes on reviews this month`,
      reviews: row.reviews,
      watched: row.watched,
    }));
  const taken = new Set(suggested.map((member) => member.id));
  return [
    ...suggested,
    ...reviewers.filter((member) => !taken.has(member.id)),
  ].slice(0, MEMBERS);
}

async function getCircleFeed(circle: CircleRow | null): Promise<Circle | null> {
  if (!circle) return null;
  return {
    following: circle.following,
    friends: circle.friends.map((row) => ({
      author: toMember(row.author),
      film: toFilm(row),
      id: row.id,
      liked: row.liked,
      rating: row.rating,
      reviewed: row.reviewed,
      rewatch: row.rewatch,
      watchedAt: row.watched_at,
    })),
    name: circle.viewer.display_name || circle.viewer.username || "",
    picks: await getPicks(circle),
    shared: circle.shared.map((row) => ({
      ...toFilm(row),
      faces: row.faces.map(toMember),
      friends: row.friends,
    })),
  };
}

export const getHomeFeed = cache(async (): Promise<HomeFeed> => {
  const [week, playing, upcoming, upcomingNext, pulse, circleRow] =
    await Promise.all([
      getTrendingMovies("week"),
      getMovieList("now_playing"),
      getMovieList("upcoming"),
      getMovieList("upcoming", { page: 2 }),
      getPulse(),
      getCircle(),
    ]);

  const today = isoDate(Date.now());
  const byPopularity = (a: FeaturedMovie, b: FeaturedMovie) =>
    b.popularity - a.popularity;
  const theatres = distinct(results(playing))
    .filter(
      (movie) =>
        movie.posterPath &&
        movie.voteCount >= THEATRES_MIN_VOTES &&
        (movie.releaseDate ?? "") <= today,
    )
    .sort(byPopularity)
    .slice(0, SHOWING);
  const soon = distinct([...results(upcoming), ...results(upcomingNext)])
    .filter((movie) => movie.posterPath && (movie.releaseDate ?? "") > today)
    .sort(byPopularity)
    .slice(0, SHOWING)
    .sort((a, b) => (a.releaseDate ?? "").localeCompare(b.releaseDate ?? ""));

  const [features, circle, waiting] = await Promise.all([
    getFeatures(distinct(results(week)), pulse),
    getCircleFeed(circleRow),
    getWaiting([...theatres, ...soon].map((movie) => movie.id)),
  ]);

  const toShowing = (movie: FeaturedMovie): ShowingFilm => ({
    ...fromTmdb(movie),
    releaseDate: movie.releaseDate,
    waiting: waiting.get(movie.id) ?? 0,
  });

  // Rising leaves out what the popular row already shows, so the two rows
  // never repeat each other.
  const shown = new Set<number>();
  const popular = fresh(
    pulse.popular
      .filter((row) => row.poster_path)
      .map((row) => ({
        ...toFilm(row),
        faces: row.faces.map(toMember),
        members: row.members,
        rating: row.rating,
        watchers: row.watchers,
      })),
    shown,
    ROW,
  );
  const rising = fresh(
    pulse.rising.map((row) => ({
      ...toFilm(row),
      lift: row.lift,
      week: row.week,
    })),
    shown,
    RISING,
  );

  return {
    circle,
    features,
    lists: pulse.lists.map((row) => ({
      description: row.description,
      films: row.items_count,
      id: row.id,
      likes: row.likes_count,
      owner: toMember(row.owner),
      previews: row.previews,
      slug: row.slug,
      title: row.title,
    })),
    members: getMembers(pulse, circleRow),
    popular,
    pulse: pulse.counts,
    rated: pulse.top_rated
      .filter((row) => row.poster_path)
      .slice(0, ROW)
      .map((row) => ({
        ...toFilm(row),
        rating: row.rating,
        ratings: row.ratings,
      })),
    reviews: pulse.reviews.slice(0, 6).map((row) => ({
      author: toMember(row.author),
      content: row.content,
      createdAt: row.created_at,
      film: toFilm(row),
      id: row.id,
      likes: row.likes_count,
      rating: row.rating,
    })),
    rising,
    soon: soon.map(toShowing),
    theatres: theatres.map(toShowing),
  };
});
