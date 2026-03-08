"use client";

import { Suspense } from "react";
import Analyzer from "@/components/tools/Analyzer";

export default function AnalyzePage() {
  return (
    <Suspense>
      <Analyzer />
    </Suspense>
  );
}
