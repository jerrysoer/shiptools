import { Metadata } from "next";
import WaveformGenerator from "@/components/tools/WaveformGenerator";

export const metadata: Metadata = {
  title: "Audio Waveform Generator — ShipLocal",
  description:
    "Generate beautiful waveform visualizations from audio files. Export as PNG.",
};

export default function WaveformGeneratorPage() {
  return <WaveformGenerator />;
}
