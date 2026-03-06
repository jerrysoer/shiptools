import { Metadata } from "next";
import TextDiff from "@/components/tools/TextDiff";

export const metadata: Metadata = {
  title: "Text Diff / Compare — ShipLocal",
  description:
    "Compare two blocks of text side by side. See additions, deletions, and unchanged lines highlighted instantly.",
};

export default function DiffPage() {
  return <TextDiff />;
}
