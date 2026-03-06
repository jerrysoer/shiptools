import { Metadata } from "next";
import CronBuilder from "@/components/tools/CronBuilder";

export const metadata: Metadata = {
  title: "Cron Expression Builder — ShipLocal",
  description:
    "Build cron expressions visually with dropdowns, presets, and a human-readable explanation. All processing happens locally in your browser.",
};

export default function CronPage() {
  return <CronBuilder />;
}
