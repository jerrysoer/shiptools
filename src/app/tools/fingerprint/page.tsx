import { Metadata } from "next";
import FingerprintViewer from "@/components/tools/FingerprintViewer";

export const metadata: Metadata = {
  title: "Browser Fingerprint Viewer — ShipTools",
  description:
    "See what your browser reveals to websites. Canvas, WebGL, fonts, screen, and hardware fingerprinting signals — all checked locally.",
};

export default function FingerprintPage() {
  return <FingerprintViewer />;
}
