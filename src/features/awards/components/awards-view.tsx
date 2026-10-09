"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { cn } from "@omerdlw/base-framework/utils";
import { movieHref, personHref } from "@/config/routes";
import { PosterThumb } from "@/features/artwork";
import { Button, Icon, SegmentedControl, Select } from "@/ui";
import { useDockLinkClick } from "@/motion";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { AwardRecipient, Awards } from "@/infrastructure/tmdb/types";
import type { AwardGroup, AwardItem, AwardsGrouping } from "../lib/types";
import { filterAwards, flattenAwards, groupAwards } from "../lib/utils";

const GROUPING_LABELS: Record<AwardsGrouping, string> = {
  organizations: "By organization",
  projects: "By project",
  timeline: "Timeline",
};

const MAX_RECIPIENTS = 4;

const EASE = [0.16, 1, 0.3, 1] as const;
const LIST: Variants = {
  exit: { opacity: 0, transition: { duration: 0.2, ease: EASE }, y: -8 },
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const GROUP: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: EASE }, y: 0 },
};
const STILL: Variants = { exit: {}, hidden: {}, visible: {} };

const ALL_ORGANIZATIONS = "all";

const LABEL = "text-[11px] font-semibold tracking-[0.16em] uppercase";

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function MovieLink({ id, name }: { id: number; name: string }) {
  const href = movieHref(id);
  const handleClick = useDockLinkClick(href);
  return (
    <Link
      className="cine-fade underline-offset-2 hover:text-white hover:underline"
      href={href}
      onClick={handleClick}
      prefetch={false}
    >
      {name}
    </Link>
  );
}

function RecipientLink({ recipient }: { recipient: AwardRecipient }) {
  const href = personHref(recipient.id);
  const handleClick = useDockLinkClick(href);

  return (
    <Link
      className="cine-fade underline-offset-2 hover:text-white hover:underline"
      href={href}
      onClick={handleClick}
      prefetch={false}
    >
      {recipient.name}
    </Link>
  );
}

function ProjectName({
  id,
  mediaType,
  name,
}: {
  id: number | null;
  mediaType: "movie" | "tv" | null;
  name: string;
}) {
  return id && mediaType === "movie" ? (
    <MovieLink id={id} name={name} />
  ) : (
    <>{name}</>
  );
}

function Stat({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: number;
}) {
  return (
    <div className="flex min-w-0 flex-col-reverse items-center gap-2 px-2 text-center">
      <dt className={cn(LABEL, "-mr-[0.16em] text-white/50")}>{label}</dt>
      <dd
        className={cn(
          "font-zuume text-5xl leading-none font-bold tabular-nums sm:text-6xl",
          strong ? "text-white" : "text-white/40",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Status({ won }: { won: boolean }) {
  return (
    <span
      className={cn(
        LABEL,
        "-mr-[0.16em] inline-flex shrink-0 items-center gap-1.5 pt-0.5",
        won ? "text-white" : "text-white/50",
      )}
    >
      {won ? <Icon icon="solar:cup-bold" size={13} /> : null}
      {won ? "Winner" : "Nominee"}
    </span>
  );
}

function AwardRow({
  item,
  omit,
  showPoster,
  showProject,
  showRecipients,
}: {
  item: AwardItem;
  omit: AwardsGrouping;
  showPoster: boolean;
  showProject: boolean;
  showRecipients: boolean;
}) {
  const parts: ReactNode[] = [];
  if (showRecipients && item.recipients.length > 0) {
    const names = item.recipients.slice(0, MAX_RECIPIENTS);
    const more = item.recipients.length - names.length;
    parts.push(
      <>
        {names.map((recipient, index) => (
          <Fragment key={recipient.id}>
            {index > 0 ? ", " : null}
            <RecipientLink recipient={recipient} />
          </Fragment>
        ))}
        {more > 0 ? ` +${more}` : null}
      </>,
    );
  }
  if (showProject && omit !== "projects" && item.project) {
    parts.push(
      <ProjectName
        id={item.projectId}
        mediaType={item.mediaType}
        name={item.project}
      />,
    );
  }
  if (omit !== "organizations") parts.push(item.organizationTitle);
  if (omit !== "timeline" && item.year) parts.push(item.year);

  return (
    <li className="flex items-start gap-4 py-3.5">
      {showPoster && omit !== "projects" && item.posterPath ? (
        <PosterThumb
          className="w-9"
          original
          movieId={item.mediaType === "movie" ? item.projectId : null}
          posterPath={item.posterPath}
        />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className={cn(
            "text-sm leading-snug font-semibold",
            item.won ? "text-white" : "text-white/70",
          )}
        >
          {item.category}
        </span>
        {parts.length > 0 ? (
          <span className="text-xs leading-snug text-white/50">
            {parts.map((part, index) => (
              <Fragment key={index}>
                {index > 0 ? " · " : null}
                {part}
              </Fragment>
            ))}
          </span>
        ) : null}
      </div>
      <Status won={item.won} />
    </li>
  );
}

function AwardGroupBlock({
  group,
  grouping,
  showPosters,
  showProject,
  showRecipients,
}: {
  group: AwardGroup;
  grouping: AwardsGrouping;
  showPosters: boolean;
  showProject: boolean;
  showRecipients: boolean;
}) {
  const logo = tmdbImageUrl("logo", group.logoPath, "original");

  return (
    <section className="flex flex-col">
      <header className="flex items-center gap-3 border-b border-white/10 pb-3">
        {grouping === "projects" && group.poster?.path ? (
          <PosterThumb
            className="w-9"
            original
            movieId={
              group.poster.mediaType === "movie" ? group.poster.id : null
            }
            posterPath={group.poster.path}
          />
        ) : null}
        {logo ? (
          <img
            alt=""
            className="size-7 shrink-0 rounded-lg bg-white/10 object-contain p-0.5"
            height={28}
            loading="lazy"
            src={logo}
            width={28}
          />
        ) : null}
        <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-white">
          {grouping === "projects" && group.poster ? (
            <ProjectName
              id={group.poster.id}
              mediaType={group.poster.mediaType}
              name={group.title}
            />
          ) : (
            group.title
          )}
        </h3>
        <span className="shrink-0 text-xs text-white/50 tabular-nums">
          {[
            group.wins > 0 ? plural(group.wins, "win", "wins") : null,
            group.nominations > 0
              ? plural(group.nominations, "nomination", "nominations")
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </header>
      <ul className="flex flex-col divide-y divide-white/[0.06]">
        {group.items.map((item) => (
          <AwardRow
            item={item}
            key={item.key}
            omit={grouping}
            showPoster={showPosters}
            showProject={showProject}
            showRecipients={showRecipients}
          />
        ))}
      </ul>
    </section>
  );
}

export function AwardsView({
  awards,
  groupings,
  showRecipients = false,
}: {
  awards: Awards | null;
  groupings: readonly AwardsGrouping[];
  showRecipients?: boolean;
}) {
  const [grouping, setGrouping] = useState<AwardsGrouping>(
    groupings[0] ?? "organizations",
  );
  const [winsOnly, setWinsOnly] = useState(false);
  const [organizationId, setOrganizationId] = useState(ALL_ORGANIZATIONS);
  const reduced = useReducedMotion();

  const items = useMemo(() => (awards ? flattenAwards(awards) : []), [awards]);
  const visible = useMemo(
    () =>
      filterAwards(items, {
        organizationId:
          organizationId === ALL_ORGANIZATIONS ? null : organizationId,
        winsOnly,
      }),
    [items, organizationId, winsOnly],
  );
  const groups = useMemo(
    () => groupAwards(visible, grouping),
    [grouping, visible],
  );

  if (!awards) {
    return (
      <p className="py-6 text-sm text-white/50">
        Awards are unavailable right now. Please try again in a moment
      </p>
    );
  }
  if (items.length === 0) {
    return (
      <p className="py-6 text-sm text-white/50">
        No awards or nominations on record
      </p>
    );
  }

  const titles = new Set(
    items.map((i) => i.projectId ?? i.project).filter(Boolean),
  );
  const manyTitles = titles.size > 1;

  const stats = [
    {
      label: awards.wins === 1 ? "Win" : "Wins",
      strong: true,
      value: awards.wins,
    },
    {
      label: awards.nominations === 1 ? "Nomination" : "Nominations",
      value: awards.nominations,
    },
    ...(groupings.includes("projects") && manyTitles
      ? [{ label: "Titles", value: titles.size }]
      : []),
    {
      label:
        awards.organizations.length === 1 ? "Organization" : "Organizations",
      value: awards.organizations.length,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <dl
        className="grid divide-x divide-white/[0.06]"
        style={{
          gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`,
        }}
      >
        {stats.map((stat) => (
          <Stat key={stat.label} {...stat} />
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
        {groupings.length > 1 ? (
          <SegmentedControl
            ariaLabel="Group awards"
            items={groupings.map((key) => ({
              key,
              label: GROUPING_LABELS[key],
            }))}
            onChange={setGrouping}
            value={grouping}
          />
        ) : null}
        <div className="flex flex-wrap items-center gap-2.5 sm:ml-auto">
          {awards.organizations.length > 1 ? (
            <Select
              ariaLabel="Organization"
              classNames={{ root: "w-48" }}
              onChange={setOrganizationId}
              options={[
                { label: "All organizations", value: ALL_ORGANIZATIONS },
                ...awards.organizations.map((organization) => ({
                  label: organization.title,
                  value: organization.id,
                })),
              ]}
              size="sm"
              value={organizationId}
            />
          ) : null}
          {awards.wins > 0 ? (
            <Button
              aria-pressed={winsOnly}
              className={cn(
                "cine-fade inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[13px] px-3 text-xs font-semibold ring-1 ring-inset",
                winsOnly
                  ? "bg-[rgb(var(--grade,252_252_251)/0.16)] text-[rgb(var(--grade,252_252_251))] ring-[rgb(var(--grade,252_252_251)/0.3)] hover:bg-[rgb(var(--grade,252_252_251)/0.24)] hover:ring-[rgb(var(--grade,252_252_251)/0.4)]"
                  : "bg-white/5 text-white/70 ring-white/5 hover:bg-white/10 hover:text-white hover:ring-white/10",
              )}
              onClick={() => setWinsOnly((value) => !value)}
              type="button"
            >
              <Icon icon="solar:cup-bold" size={13} />
              Wins only
            </Button>
          ) : null}
        </div>
      </div>

      <AnimatePresence initial={false} mode="wait">
        <motion.div
          animate="visible"
          className="flex flex-col gap-10"
          exit="exit"
          initial="hidden"
          key={`${grouping}:${organizationId}:${winsOnly}`}
          variants={reduced ? STILL : LIST}
        >
          {groups.length === 0 ? (
            <p className="py-6 text-sm text-white/50">
              Nothing matches these filters
            </p>
          ) : (
            groups.map((group) => (
              <motion.div key={group.key} variants={reduced ? STILL : GROUP}>
                <AwardGroupBlock
                  group={group}
                  grouping={grouping}
                  showPosters={manyTitles}
                  showProject={manyTitles}
                  showRecipients={showRecipients}
                />
              </motion.div>
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
