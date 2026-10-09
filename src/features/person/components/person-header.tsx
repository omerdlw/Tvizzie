"use client";

import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { cn } from "@omerdlw/base-framework/utils";
import { Button, Icon, Tooltip } from "@/ui";
import {
  BIO_CLASS,
  HEADER_CLASS,
  LABEL_TYPE,
  LINKS_CLASS,
  RULE_GAP,
  nameClass,
} from "../lib/layout";
import { SCENE, linksGap } from "../lib/motion";
import { size } from "../lib/tempo";
import {
  Decode,
  Fade,
  Hairline,
  Layer,
  Rise,
  Sequence,
  Title,
  Words,
} from "../stage";
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
          <Decode at={SCENE.label.at} out={0} run={SCENE.label.run}>
            {role}
          </Decode>
        </span>
      ) : null}
      <Hairline className="w-auto min-w-6 flex-1" />
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
          className={`${BIO_CLASS} whitespace-pre-line`}
        >
          {excerpt}
        </Words>
      </Layer>
      {truncated ? (
        <Layer {...SCENE.layers.bio}>
          <Fade at={SCENE.opening.end - size(1)} out={0} run={size(0)}>
            <Button
              aria-label={`Read the full biography of ${name}`}
              className="cine-fade cursor-pointer text-[11px] font-semibold tracking-[0.18em] text-white/70 uppercase hover:text-white"
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
  return (
    <ul aria-label="Profiles" className={LINKS_CLASS}>
      {links.map((link, index) => (
        <li key={link.key}>
          <Rise at={SCENE.links.at + index * gap} from="scale">
            <Tooltip position="top" text={link.label}>
              <a
                aria-label={`${name} on ${link.label}`}
                className="cine-fade center size-9 rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                href={link.url}
                referrerPolicy="no-referrer"
                rel="noopener noreferrer"
                target="_blank"
              >
                <Icon icon={link.icon} size={20} />
              </a>
            </Tooltip>
          </Rise>
        </li>
      ))}
    </ul>
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
