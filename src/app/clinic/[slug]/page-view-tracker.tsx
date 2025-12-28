"use client";

import { useEffect, useRef } from "react";

interface PageViewTrackerProps {
  clinicId: string;
}

export function PageViewTracker({ clinicId }: PageViewTrackerProps) {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (hasTrackedRef.current) return;
    hasTrackedRef.current = true;

    fetch("/api/track/clinic-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clinicId }),
    }).catch(() => {});
  }, [clinicId]);

  return null;
}
