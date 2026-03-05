import { Metadata } from "next";
import TrackingPixelDetector from "@/components/tools/TrackingPixelDetector";

export const metadata: Metadata = {
  title: "Tracking Pixel Detector — ShipTools",
  description:
    "Paste email HTML to detect hidden tracking pixels, known trackers, UTM parameters, and prefetch beacons. All analysis runs in your browser.",
};

export default function TrackingPixelsPage() {
  return <TrackingPixelDetector />;
}
