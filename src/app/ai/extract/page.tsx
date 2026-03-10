"use client";

import StructuredExtractor from "@/components/tools/StructuredExtractor";
import { AiFeatureGate } from "@/components/AiFeatureGate";

export default function ExtractPage() {
  return (
    <AiFeatureGate tool="extract">
      <StructuredExtractor />
    </AiFeatureGate>
  );
}
