"use client";

import { ArrowUpCircle } from "lucide-react";
import Link from "next/link";
import { useLocalAI } from "@/hooks/useLocalAI";
import { getBestModelForCapability } from "@/lib/ai/registry";
import type { ModelCapability } from "@/lib/ai/registry";

interface ModelSuggestionProps {
  capability: ModelCapability;
}

/**
 * "Better model available" banner.
 * Shows when the current model CAN do the task but a higher-tier model would do it better.
 */
export default function ModelSuggestion({
  capability,
}: ModelSuggestionProps) {
  const { selectedSlug } = useLocalAI();

  const bestPack = getBestModelForCapability(capability);
  if (!bestPack || !selectedSlug || bestPack.slug === selectedSlug) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-accent/5 border border-accent/20 text-xs text-text-secondary">
      <ArrowUpCircle className="w-3.5 h-3.5 text-accent flex-shrink-0" />
      <span>
        For best results, switch to{" "}
        <Link
          href="/ai/models"
          className="text-accent hover:underline font-medium"
        >
          {bestPack.name}
        </Link>
      </span>
    </div>
  );
}
