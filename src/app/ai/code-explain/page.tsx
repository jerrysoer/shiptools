"use client";

import CodeExplainer from "@/components/tools/CodeExplainer";
import { AiFeatureGate } from "@/components/AiFeatureGate";

export default function CodeExplainPage() {
  return (
    <AiFeatureGate tool="code-explain">
      <CodeExplainer />
    </AiFeatureGate>
  );
}
