"use client";

import { Suspense } from "react";
import Writer from "@/components/tools/Writer";
import { AiFeatureGate } from "@/components/AiFeatureGate";

export default function WriterPage() {
  return (
    <AiFeatureGate tool="writer">
      <Suspense>
        <Writer />
      </Suspense>
    </AiFeatureGate>
  );
}
