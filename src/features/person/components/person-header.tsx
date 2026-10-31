"use client";

import { useId, useState } from "react";
import { LayoutGroup } from "motion/react";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { cn } from "@omerdlw/base-framework/utils";
import {
  Button,
  HEADER_CLASS,
  Icon,
  PROSE_CLASS,
  RULE_GAP,
  TONE,
  Tooltip,
} from "@/ui";
import { SlidingHighlight } from "@/ui/sliding-highlight";
import { LABEL_TYPE, LINKS_CLASS, nameClass } from "../lib/layout";
import { SCENE, linksGap } from "../lib/motion";
import {
  Expose,
  Fade,
  Hairline,
  Layer,
  Sequence,
  size,
  Title,
  Words,
} from "@/motion/stage";
import type { SocialLink } from "../lib/types";
import { createPersonBioSurfaceEntry } from "./person-bio-surface";

function Rule({
  links,
  name,
  role,
}: {
  links: readonly SocialLink[];
  name: string;
  role: string | null;
}) {
  return (
    <Layer
      className={cn(RULE_GAP, "flex items-center gap-4")}
      {...SCENE.layers.rule}
    >
      {role ? (
        <span className={cn(LABEL_TYPE, "shrink-0 text-white/70")}>
          <Expose at={SCENE.label.at} out={0} run={SCENE.label.run}>
            {role}
          </Expose>
        </span>
      ) : null}
      <Hairline className="w-auto min-w-6 flex-1" {...SCENE.rule} />
      {links.length > 0 ? <Links links={links} name={name} /> : null}
    </Layer>
  );
}

function Bio({
  excerpt,
  full,
  name,
  truncated,
}: {
  excerpt: string;
  full: string;
  name: string;
  truncated: boolean;
}) {
  const { openSurface } = useDockActions();

  const openFull = () => {
    void openSurface(createPersonBioSurfaceEntry({ biography: full, name }));
  };

  return (
    <div className="flex flex-col items-start gap-3">
      <Layer {...SCENE.layers.bio}>
        <Words
          {...SCENE.bio}
          alpha={0.7}
          className={`${PROSE_CLASS} whitespace-pre-line`}
        >
          {excerpt}
        </Words>
      </Layer>
      {truncated ? (
        <Layer {...SCENE.layers.bio}>
          <Fade at={SCENE.opening.end - size(1)} out={0} run={size(0)}>
            <Button
              aria-label={`Read the full biography of ${name}`}
              className={`cine-fade cursor-pointer ${TONE.label} text-white/70 hover:text-white`}
              onClick={openFull}
              type="button"
            >
              Read more
            </Button>
          </Fade>
        </Layer>
      ) : null}
    </div>
  );
}

function Links({
  links,
  name,
}: {
  links: readonly SocialLink[];
  name: string;
}) {
  const gap = linksGap(links.length);
  const highlightGroupId = useId();
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [focusedLink, setFocusedLink] = useState<string | null>(null);
  return (
    <LayoutGroup id={`person-links-${highlightGroupId}`}>
      <ul
        aria-label="Profiles"
        className={LINKS_CLASS}
        onBlurCapture={(event) => {
          if (
            !(event.relatedTarget instanceof Node) ||
            !event.currentTarget.contains(event.relatedTarget)
          ) {
            setFocusedLink(null);
          }
        }}
        onPointerLeave={() => setHoveredLink(null)}
      >
        {links.map((link, index) => (
          <li className="relative isolate" key={link.key}>
            {(hoveredLink ?? focusedLink) === link.key ? (
              <SlidingHighlight
                className="rounded-full bg-white/10"
                layoutId="person-links-highlight"
              />
            ) : null}
            <Fade at={SCENE.links.at + index * gap} run={size(2)}>
              <Tooltip position="top" text={link.label}>
                <a
                  aria-label={`${name} on ${link.label}`}
                  className="cine-fade center relative z-10 size-9 rounded-full text-white/70 hover:text-white"
                  href={link.url}
                  onFocus={() => setFocusedLink(link.key)}
                  onPointerEnter={() => setHoveredLink(link.key)}
                  referrerPolicy="no-referrer"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Icon icon={link.icon} size={20} />
                </a>
              </Tooltip>
            </Fade>
          </li>
        ))}
      </ul>
    </LayoutGroup>
  );
}

export function PersonHeader({
  biography,
  excerpt,
  links,
  name,
  role,
  truncated,
}: {
  biography: string | null;
  excerpt: string | null;
  links: readonly SocialLink[];
  name: string;
  role: string | null;
  truncated: boolean;
}) {
  return (
    <Sequence as="header" className={HEADER_CLASS}>
      <Layer {...SCENE.layers.title}>
        <Title className={nameClass(name)}>{name}</Title>
      </Layer>
      <Rule links={links} name={name} role={role} />
      {biography && excerpt ? (
        <Bio
          excerpt={excerpt}
          full={biography}
          name={name}
          truncated={truncated}
        />
      ) : null}
    </Sequence>
  );
}
