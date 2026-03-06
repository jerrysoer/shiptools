import { Metadata } from "next";
import VoiceMemo from "@/components/recording/VoiceMemo";

export const metadata: Metadata = {
  title: "Voice Memo — ShipLocal",
  description:
    "Record voice memos in your browser. Bookmark, trim, and export as WebM, MP3, or WAV.",
};

export default function VoiceMemoPage() {
  return <VoiceMemo />;
}
