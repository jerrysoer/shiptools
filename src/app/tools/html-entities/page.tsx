import { Metadata } from "next";
import HtmlEntityEncoder from "@/components/tools/HtmlEntityEncoder";

export const metadata: Metadata = {
  title: "HTML Entity Encoder / Decoder — ShipLocal",
  description:
    "Encode special characters to HTML entities and decode entities back to characters. Supports named and numeric entities. All processing happens locally in your browser.",
};

export default function HtmlEntitiesPage() {
  return <HtmlEntityEncoder />;
}
