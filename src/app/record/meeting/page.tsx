import { Metadata } from "next";
import MeetingRecorder from "@/components/recording/MeetingRecorder";

export const metadata: Metadata = {
  title: "Meeting Recorder — ShipLocal",
  description:
    "Record, transcribe, and summarize meetings. Export as ZIP with audio, transcript, and summary.",
};

export default function MeetingRecorderPage() {
  return <MeetingRecorder />;
}
