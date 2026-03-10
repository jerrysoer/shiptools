"use client";

import { useEffect, useState, type ReactNode } from "react";
import { checkWebGPUSupport, type GpuCheckResult } from "@/lib/ai/gpu-check";
import { trackEvent } from "@/lib/analytics";

interface Props {
  tool: string;
  children: ReactNode;
}

export function AiFeatureGate({ tool, children }: Props) {
  const [gpuCheck, setGpuCheck] = useState<GpuCheckResult | null>(null);

  useEffect(() => {
    checkWebGPUSupport().then((result) => {
      setGpuCheck(result);
      if (!result.supported) {
        trackEvent("ai_feature_unavailable", {
          reason: result.reason ?? "unknown",
          tool,
        });
      }
    });
  }, [tool]);

  // Still checking — render nothing to avoid flash
  if (gpuCheck === null) {
    return null;
  }

  if (!gpuCheck.supported) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center px-6">
        <div className="rounded-xl border border-border bg-bg-surface p-8 max-w-md">
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            AI feature unavailable on this browser
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed">
            This tool requires WebGPU, which isn&apos;t supported in your
            current browser. Try Chrome 113+ or Edge 113+ on desktop for the
            full experience.
          </p>
          <p className="text-text-tertiary text-xs mt-4">
            All non-AI tools work on any browser.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
