"use client";

import { createContext, use } from "react";

interface RoomState {
  lead: string | null;
  setLead: (src: string | null) => void;
}

export const RoomContext = createContext<RoomState>({
  lead: null,
  setLead: () => {},
});

export const useRoom = () => use(RoomContext);
