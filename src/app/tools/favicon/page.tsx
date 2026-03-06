import { Metadata } from "next";
import FaviconGenerator from "@/components/tools/FaviconGenerator";

export const metadata: Metadata = {
  title: "Favicon Generator — ShipLocal",
  description:
    "Generate favicons from an image or emoji. Preview all sizes and download as PNG or ICO.",
};

export default function FaviconPage() {
  return <FaviconGenerator />;
}
