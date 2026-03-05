import { Metadata } from "next";
import EpochConverter from "@/components/tools/EpochConverter";

export const metadata: Metadata = {
  title: "Epoch / Timestamp Converter — ShipTools",
  description:
    "Convert between Unix epoch timestamps, ISO 8601, and human-readable dates. Live clock, timezone picker, auto-detect seconds vs milliseconds.",
};

export default function EpochPage() {
  return <EpochConverter />;
}
