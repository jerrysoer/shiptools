import { Metadata } from "next";
import ScreenRecorder from "@/components/recording/ScreenRecorder";

export const metadata: Metadata = {
  title: "Screen Recorder — ShipLocal",
  description:
    "Record your screen with optional webcam overlay and audio. Export as WebM or MP4.",
};

export default function ScreenRecorderPage() {
  return <ScreenRecorder />;
}
