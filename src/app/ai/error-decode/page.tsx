"use client";

import ErrorDecoder from "@/components/tools/ErrorDecoder";
import { AiFeatureGate } from "@/components/AiFeatureGate";

export default function ErrorDecodePage() {
  return (
    <AiFeatureGate tool="error-decode">
      <ErrorDecoder />
    </AiFeatureGate>
  );
}
