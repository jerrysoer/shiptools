"use client";

import { useEffect, useState } from "react";
import { checkWebGPUSupport } from "@/lib/ai/gpu-check";

export function WebGpuBadge() {
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    checkWebGPUSupport().then((r) => setSupported(r.supported));
  }, []);

  if (supported) return null;

  return (
    <span className="text-xs text-text-secondary bg-bg-elevated px-2 py-1 rounded">
      Desktop Chrome only
    </span>
  );
}
