"use client";

import { Suspense } from "react";
import AISummarizer from "@/components/tools/AISummarizer";
import { AiFeatureGate } from "@/components/AiFeatureGate";

export default function SummarizePage() {
  return (
    <AiFeatureGate tool="summarizer">
      <Suspense>
        <AISummarizer />
      </Suspense>
    </AiFeatureGate>
  );
}
