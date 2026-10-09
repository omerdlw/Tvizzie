"use client";

import type { JSX } from "react";
import type { SurfaceEntry } from "@omerdlw/base-framework/modules/dock";
import { SURFACE_LEAD, SurfaceScene, scrollWithin } from "@/features/movie";
import { Cascade, Item } from "../stage";

interface PersonBioData {
  biography: string;
  name: string;
}

const SURFACE_WIDTH = 560;

export function createPersonBioSurfaceEntry(data: PersonBioData): SurfaceEntry {
  return {
    component: PersonBioSurface,
    description: data.name,
    icon: "solar:document-text-bold",
    props: { data },
    title: "Biography",
    width: SURFACE_WIDTH,
  };
}

function PersonBioSurface({ data }: { data: PersonBioData }): JSX.Element {
  return (
    <SurfaceScene>
      <Cascade className="flex w-full flex-col" lead={SURFACE_LEAD}>
        <Item from="up">
          <div
            className="max-h-[min(52dvh,24rem)] overflow-y-auto overscroll-contain"
            data-lenis-prevent
            data-lenis-prevent-wheel
            onWheel={scrollWithin}
          >
            <p className="text-left text-sm leading-6 text-pretty [overflow-wrap:anywhere] whitespace-pre-line text-white/70">
              {data.biography}
            </p>
          </div>
        </Item>
      </Cascade>
    </SurfaceScene>
  );
}
