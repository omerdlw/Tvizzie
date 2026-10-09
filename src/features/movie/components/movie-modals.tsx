"use client";

import { useState } from "react";
import {
  defineModal,
  ModalContainer,
  type ModalContainerProps,
} from "@omerdlw/base-framework/modules/modal";
import { SegmentedControl } from "@/ui";
import { useShowing } from "@/motion/film";
import type { PersonEntry } from "../lib/types";
import { PersonCard } from "./person-card";

interface ModalProps<T> {
  close: (result?: unknown) => void;
  data: T;
  header: ModalContainerProps["header"];
}

export interface PeopleModalData {
  cast: PersonEntry[];
  crew: PersonEntry[];
  initialTab: "cast" | "crew";
}

function PeopleModalView({ close, data, header }: ModalProps<PeopleModalData>) {
  const [tab, setTab] = useState(data.initialTab);
  const tabs = [
    ...(data.cast.length ? [{ key: "cast" as const, label: "Cast" }] : []),
    ...(data.crew.length ? [{ key: "crew" as const, label: "Crew" }] : []),
  ];
  const people = tab === "cast" ? data.cast : data.crew;

  return (
    <ModalContainer close={close} header={header}>
      <div className="flex flex-col gap-3">
        <SegmentedControl
          ariaLabel="Cast or crew"
          items={tabs}
          onChange={setTab}
          value={tab}
        />
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {people.map((person) => (
            <li className="min-w-0" key={person.key}>
              <PersonCard onNavigated={() => close()} person={person} />
            </li>
          ))}
        </ul>
      </div>
    </ModalContainer>
  );
}

export const PeopleModal = defineModal({
  component: PeopleModalView,
  position: { desktop: "center", mobile: "bottom" },
  title: "Cast & crew",
});

export interface VideoModalData {
  key: string;
  name: string;
}

function VideoModalView({ data }: ModalProps<VideoModalData>) {
  useShowing();
  return (
    <div className="aspect-video w-[min(92vw,64rem)] overflow-hidden rounded-[20px] bg-black ring-1 ring-white/10 ring-inset">
      <iframe
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        className="size-full"
        referrerPolicy="strict-origin-when-cross-origin"
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(data.key)}?autoplay=1&rel=0`}
        title={data.name}
      />
    </div>
  );
}

export const VideoModal = defineModal({
  chrome: "bare",
  component: VideoModalView,
  position: "center",
});

export interface ImageModalData {
  alt: string;
  src: string;
}

function ImageModalView({ data }: ModalProps<ImageModalData>) {
  return (
    <img
      alt={data.alt}
      className="max-h-[85vh] max-w-[92vw] rounded-[20px] object-contain ring-1 ring-white/10"
      draggable={false}
      src={data.src}
    />
  );
}

export const ImageModal = defineModal({
  chrome: "bare",
  component: ImageModalView,
  position: "center",
});
