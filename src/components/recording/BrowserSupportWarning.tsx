"use client";

import { AlertTriangle } from "lucide-react";

interface BrowserSupportWarningProps {
  feature: string;
  description?: string;
}

export default function BrowserSupportWarning({
  feature,
  description,
}: BrowserSupportWarningProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
      <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-text-primary">
          {feature} is not supported in this browser
        </p>
        {description && (
          <p className="text-sm text-text-secondary mt-1">{description}</p>
        )}
        <p className="text-xs text-text-tertiary mt-2">
          For the best experience, try the latest version of Chrome, Edge, or
          Firefox.
        </p>
      </div>
    </div>
  );
}
