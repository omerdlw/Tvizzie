"use client";

import type { JSX } from "react";
import type { SurfaceEntry } from "@omerdlw/base-framework/modules/dock";
import { SurfaceProse } from "@/ui";
import { Cascade, Item, SURFACE_LEAD, SurfaceScene } from "@/motion/stage";

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
          <SurfaceProse text={data.biography} />
        </Item>
      </Cascade>
    </SurfaceScene>
  );
}
