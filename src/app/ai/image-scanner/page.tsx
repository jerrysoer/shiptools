"use client";

import { Suspense } from "react";
import ImageScanner from "@/components/tools/ImageScanner";
import { AiFeatureGate } from "@/components/AiFeatureGate";

export default function ImageScannerPage() {
  return (
    <AiFeatureGate tool="image-scanner">
      <Suspense>
        <ImageScanner />
      </Suspense>
    </AiFeatureGate>
  );
}
