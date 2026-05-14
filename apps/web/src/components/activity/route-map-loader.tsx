"use client";

import dynamic from "next/dynamic";

export const RouteMap = dynamic(
  () => import("./route-map").then((m) => m.RouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">
        Loading map…
      </div>
    ),
  },
);
