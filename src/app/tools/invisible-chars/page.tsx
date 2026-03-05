import { Metadata } from "next";
import InvisibleCharDetector from "@/components/tools/InvisibleCharDetector";

export const metadata: Metadata = {
  title: "Invisible Character Detector — ShipTools",
  description:
    "Detect zero-width characters, homoglyphs, and bidi controls hidden in text. Clean and copy safe text — all in your browser.",
};

export default function InvisibleCharsPage() {
  return <InvisibleCharDetector />;
}
