import { Metadata } from "next";
import GifRecorder from "@/components/recording/GifRecorder";

export const metadata: Metadata = {
  title: "GIF Recorder — ShipLocal",
  description:
    "Record your screen as a high-quality animated GIF. Adjust FPS, resolution, and duration.",
};

export default function GifRecorderPage() {
  return <GifRecorder />;
}
