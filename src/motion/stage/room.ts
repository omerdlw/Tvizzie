"use client";

import { createContext, use } from "react";

// What light is in the room besides the film's own: a still someone is
// lingering over.
export interface RoomState {
  lead: string | null;
  setLead: (src: string | null) => void;
}

export const RoomContext = createContext<RoomState>({
  lead: null,
  setLead: () => {},
});

export const useRoom = () => use(RoomContext);
