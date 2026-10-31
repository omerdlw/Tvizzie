import type { JSX, ReactNode } from "react";
import { MoviePosterLink } from "@/features/movie";
import { RatingStars } from "@/features/reviews";
import { AvatarStack } from "@/features/social";
import { Carousel, Header, Section } from "@/motion/stage";
import { Avatar, CAROUSEL_ITEM, Icon, TONE } from "@/ui";
import { compact } from "../lib/format";
import type {
  FriendLog,
  HomeFilm,
  Member,
  PopularFilm,
  RatedFilm,
  SharedFilm,
} from "../lib/types";

const ROW_ITEM =
  "w-[calc((100%-1.5rem)/3)] md:w-[calc((100%-2.25rem)/4)] lg:w-[calc((100%-3rem)/5)]";
const CAPTION =
  "flex min-h-5 min-w-0 items-center gap-1.5 text-xs font-medium text-white/45 tabular-nums";

const faces = (members: Member[]) =>
  members.map((member) => ({ ...member, id: member.username }));

export function FilmRow({
  actions,
  caption,
  films,
  icon,
  title,
  wide = true,
}: {
  actions?: ReactNode;
  caption?: (film: HomeFilm, index: number) => ReactNode;
  films: HomeFilm[];
  icon: string;
  title: string;
  /** Five to a row on large screens, or the film page's four. */
  wide?: boolean;
}): JSX.Element | null {
  if (films.length === 0) return null;
  return (
    <Section className="flex w-full flex-col">
      <Header actions={actions} icon={icon} title={title} />
      <Carousel
        arrowClassName={TONE.arrows}
        className="rounded-[16px]"
        itemClassName={wide ? ROW_ITEM : CAROUSEL_ITEM}
        label={title}
        radius={16}
      >
        {films.map((film, index) => (
          <MoviePosterLink
            caption={caption?.(film, index)}
            key={film.id}
            movie={film}
            radius={16}
            sizes="(min-width: 1024px) 18vw, (min-width: 768px) 22vw, 30vw"
          />
        ))}
      </Carousel>
    </Section>
  );
}

export function PopularRow({
  films,
}: {
  films: PopularFilm[];
}): JSX.Element | null {
  const byId = new Map(films.map((film) => [film.id, film]));
  return (
    <FilmRow
      caption={(film) => {
        const popular = byId.get(film.id)!;
        return (
          <span className={CAPTION}>
            <Icon icon="solar:eye-bold" size={13} />
            {compact(popular.members)}
            {popular.rating ? (
              <>
                <Icon className="ml-1.5" icon="solar:star-bold" size={12} />
                {popular.rating.toFixed(1)}
              </>
            ) : null}
          </span>
        );
      }}
      films={films}
      icon="solar:fire-bold"
      title="Popular this week"
    />
  );
}

export function FriendsRow({
  logs,
}: {
  logs: FriendLog[];
}): JSX.Element | null {
  if (logs.length === 0) return null;
  return (
    <Section className="flex w-full flex-col">
      <Header icon="solar:users-group-rounded-bold" title="New from friends" />
      <Carousel
        arrowClassName={TONE.arrows}
        className="rounded-[16px]"
        itemClassName={ROW_ITEM}
        label="New from friends"
        radius={16}
      >
        {logs.map((log) => (
          <MoviePosterLink
            caption={
              <span className={CAPTION}>
                <Avatar
                  className="shrink-0 rounded-full"
                  name={log.author.displayName}
                  size={18}
                  src={log.author.avatarUrl ?? undefined}
                />
                <span className="min-w-0 truncate">
                  {log.author.displayName.split(/\s+/)[0]}
                </span>
                {log.rating ? (
                  <span className="flex shrink-0">
                    <RatingStars rating={log.rating} size={10} />
                  </span>
                ) : null}
                {log.liked ? (
                  <Icon
                    className="shrink-0 text-[#ff9010]"
                    icon="solar:heart-bold"
                    size={12}
                  />
                ) : null}
                {log.reviewed ? (
                  <Icon
                    className="shrink-0"
                    icon="solar:document-text-bold"
                    size={12}
                  />
                ) : null}
                {log.rewatch ? (
                  <Icon
                    className="shrink-0"
                    icon="solar:restart-bold"
                    size={12}
                  />
                ) : null}
              </span>
            }
            detail={`logged by ${log.author.displayName}`}
            key={log.id}
            movie={log.film}
            radius={16}
            sizes="(min-width: 1024px) 18vw, (min-width: 768px) 22vw, 30vw"
          />
        ))}
      </Carousel>
    </Section>
  );
}

export function SharedRow({
  films,
}: {
  films: SharedFilm[];
}): JSX.Element | null {
  const byId = new Map(films.map((film) => [film.id, film]));
  return (
    <FilmRow
      caption={(film) => {
        const shared = byId.get(film.id)!;
        return (
          <span className={CAPTION}>
            <AvatarStack people={faces(shared.faces)} round size={18} />
            {shared.friends} friends
          </span>
        );
      }}
      films={films}
      icon="solar:eye-bold"
      title="Friends are watching"
    />
  );
}

export function RatedRow({
  films,
}: {
  films: RatedFilm[];
}): JSX.Element | null {
  const byId = new Map(films.map((film) => [film.id, film]));
  return (
    <FilmRow
      caption={(film) => {
        const rated = byId.get(film.id)!;
        return (
          <span className={CAPTION}>
            <Icon className="text-amber-400" icon="solar:star-bold" size={12} />
            <span className="text-white/70">{rated.rating.toFixed(2)}</span>
            <span className="hidden truncate sm:inline">
              · {compact(rated.ratings)} ratings
            </span>
          </span>
        );
      }}
      films={films}
      icon="solar:cup-star-bold"
      title="Highest rated by members"
    />
  );
}
