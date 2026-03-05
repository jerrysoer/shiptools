"use client";

import { useEffect, useState } from "react";
import { hasOptedOut } from "@/lib/consent";

export default function AnalyticsStatus() {
  const [optedOut, setOptedOut] = useState(false);

  useEffect(() => {
    setOptedOut(hasOptedOut());
  }, []);

  if (!optedOut) return null;

  return <span className="text-text-tertiary text-xs">Analytics: Off</span>;
}
