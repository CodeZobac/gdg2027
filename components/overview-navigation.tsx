"use client";

import { createContext } from "react";

/** Presentation owns topic state so the primary control can advance local demos. */
export const OverviewNavigation = createContext<{
  topic: number;
  selectTopic: (topic: number) => void;
} | null>(null);
