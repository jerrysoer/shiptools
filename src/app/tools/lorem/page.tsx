import { Metadata } from "next";
import LoremIpsumGenerator from "@/components/tools/LoremIpsumGenerator";

export const metadata: Metadata = {
  title: "Lorem Ipsum Generator — ShipLocal",
  description:
    "Generate lorem ipsum placeholder text by paragraphs, sentences, or words. Copy with one click. All processing happens locally in your browser.",
};

export default function LoremPage() {
  return <LoremIpsumGenerator />;
}
