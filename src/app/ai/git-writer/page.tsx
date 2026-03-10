"use client";

import GitWriter from "@/components/tools/GitWriter";
import { AiFeatureGate } from "@/components/AiFeatureGate";

export default function GitWriterPage() {
  return (
    <AiFeatureGate tool="git-writer">
      <GitWriter />
    </AiFeatureGate>
  );
}
