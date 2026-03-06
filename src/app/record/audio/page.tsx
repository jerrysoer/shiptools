import { Metadata } from "next";
import AudioRecorder from "@/components/recording/AudioRecorder";

export const metadata: Metadata = {
  title: "Audio Recorder — ShipLocal",
  description:
    "Capture system audio, microphone, or both. Mix, trim, and export as MP3/WAV/OGG.",
};

export default function AudioRecorderPage() {
  return <AudioRecorder />;
}
