import { Metadata } from "next";
import ConverterTabs from "@/components/ConverterTabs";
import VideoConverter from "@/components/VideoConverter";

export const metadata: Metadata = {
  title: "Video Converter — ShipTools",
  description:
    "Convert videos between MP4, WebM, and GIF. Resize, trim, and adjust quality. All processing happens locally in your browser.",
};

export default function VideoPage() {
  return (
    <div className="space-y-6">
      <ConverterTabs />
      <div>
        <h1 className="font-heading font-bold text-2xl mb-1">Video Converter</h1>
        <p className="text-text-secondary text-sm">
          Convert, resize, and trim videos. Supports MP4, WebM, MOV, AVI, MKV, GIF.
          All processing runs locally via WebAssembly.
        </p>
      </div>
      <VideoConverter />
    </div>
  );
}
