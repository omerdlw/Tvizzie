import type { JSX } from "react";
import { Icon, Tooltip } from "@/ui";
import { Fade, Item } from "@/motion/stage";
import { SCENE } from "../lib/motion";
import type { FilmStats } from "../lib/types";

const compact = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
  notation: "compact",
});
const exact = new Intl.NumberFormat("en");

const members = (count: number) =>
  `${exact.format(count)} ${count === 1 ? "member" : "members"}`;

const STATS = [
  {
    color: "text-[#00e054]",
    icon: "solar:eye-bold",
    label: (stats: FilmStats) => `Watched by ${members(stats.watched)}`,
    value: (stats: FilmStats) => stats.watched,
  },
  {
    color: "text-[#40bcf4]",
    icon: "solar:widget-bold",
    label: (stats: FilmStats) =>
      `Appears in ${exact.format(stats.listed)} ${stats.listed === 1 ? "list" : "lists"}`,
    value: (stats: FilmStats) => stats.listed,
  },
  {
    color: "text-[#ff9010]",
    icon: "solar:heart-bold",
    label: (stats: FilmStats) => `Liked by ${members(stats.liked)}`,
    value: (stats: FilmStats) => stats.liked,
  },
] as const;

export function MovieStats({
  stats,
}: {
  stats: FilmStats | null;
}): JSX.Element | null {
  if (!stats || stats.watched + stats.listed + stats.liked === 0) return null;

  return (
    <Item exit={false} from="light">
      <Fade
        className="flex items-center justify-center gap-5"
        run={SCENE.action.run}
        since={SCENE.action.content}
      >
        {STATS.map((stat) => (
          <Tooltip key={stat.icon} position="top" text={stat.label(stats)}>
            <span className="flex cursor-help items-center gap-1.5 text-[13px] leading-5 font-medium text-white/60 tabular-nums">
              <Icon className={stat.color} icon={stat.icon} size={16} />
              {compact.format(stat.value(stats))}
            </span>
          </Tooltip>
        ))}
      </Fade>
    </Item>
  );
}
