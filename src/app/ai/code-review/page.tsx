"use client";

import CodeReviewer from "@/components/tools/CodeReviewer";
import { AiFeatureGate } from "@/components/AiFeatureGate";

export default function CodeReviewPage() {
  return (
    <AiFeatureGate tool="code-review">
      <CodeReviewer />
    </AiFeatureGate>
  );
}
