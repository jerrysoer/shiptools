import { Metadata } from "next";
import MarkdownEditor from "@/components/tools/MarkdownEditor";

export const metadata: Metadata = {
  title: "Markdown Editor — ShipLocal",
  description:
    "Write Markdown with a live preview. Toolbar for bold, italic, headings, links, and code blocks.",
};

export default function MarkdownPage() {
  return <MarkdownEditor />;
}
