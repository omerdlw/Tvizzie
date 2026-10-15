"use client";

import { createContext, use } from "react";

// What light is in the room besides the film's own: the scene the page arrived
// from, a still someone is lingering over, or the scene it is leaving for.
export interface RoomState {
  arrival: string | null;
  destination: string | null;
  lead: string | null;
  setLead: (src: string | null) => void;
}

export const RoomContext = createContext<RoomState>({
  arrival: null,
  destination: null,
  lead: null,
  setLead: () => {},
});

export const useRoom = () => use(RoomContext);
