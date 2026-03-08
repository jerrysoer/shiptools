"use client";

import { Suspense } from "react";
import Writer from "@/components/tools/Writer";

export default function WriterPage() {
  return (
    <Suspense>
      <Writer />
    </Suspense>
  );
}
