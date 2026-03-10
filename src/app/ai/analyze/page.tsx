"use client";

import { Suspense } from "react";
import Analyzer from "@/components/tools/Analyzer";
import { AiFeatureGate } from "@/components/AiFeatureGate";

export default function AnalyzePage() {
  return (
    <AiFeatureGate tool="analyze">
      <Suspense>
        <Analyzer />
      </Suspense>
    </AiFeatureGate>
  );
}
