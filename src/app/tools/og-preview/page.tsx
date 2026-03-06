import { Metadata } from "next";
import OgPreview from "@/components/tools/OgPreview";

export const metadata: Metadata = {
  title: "OG Image Preview — ShipLocal",
  description:
    "Preview how your Open Graph tags look on Twitter, Facebook, LinkedIn, and Slack.",
};

export default function OgPreviewPage() {
  return <OgPreview />;
}
