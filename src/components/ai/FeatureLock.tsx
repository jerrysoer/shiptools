"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useLocalAI } from "@/hooks/useLocalAI";
import { canUseFeature, getRequiredModelLabel } from "@/lib/ai/registry";
import type { ModelCapability } from "@/lib/ai/registry";

interface FeatureLockProps {
  requiredCapability: ModelCapability;
  children: React.ReactNode;
  fallbackLabel?: string;
}

/**
 * Gating wrapper: renders children if the active model supports the capability,
 * otherwise shows a lock message with a link to the Model Store.
 */
export default function FeatureLock({
  requiredCapability,
  children,
  fallbackLabel,
}: FeatureLockProps) {
  const { selectedSlug, isSupported } = useLocalAI();

  if (!isSupported) return null;

  const hasCapability = canUseFeature(requiredCapability, selectedSlug);

  if (hasCapability) {
    return <>{children}</>;
  }

  const requiredModel = getRequiredModelLabel(requiredCapability);
  const label =
    fallbackLabel ?? `This feature requires the ${requiredModel} model pack`;

  return (
    <div className="flex items-center gap-3 p-4 bg-bg-elevated border border-border text-sm text-text-secondary">
      <Lock className="w-4 h-4 text-text-tertiary flex-shrink-0" />
      <div>
        <p>{label}</p>
        <Link
          href="/ai/models"
          className="text-accent hover:underline text-xs mt-1 inline-block"
        >
          Upgrade model &rarr;
        </Link>
      </div>
    </div>
  );
}
