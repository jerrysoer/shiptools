import { Metadata } from "next";
import ClipboardCleaner from "@/components/tools/ClipboardCleaner";

export const metadata: Metadata = {
  title: "Clipboard Cleaner — ShipTools",
  description:
    "Paste rich text to strip tracking pixels, hidden spans, inline styles, and Microsoft Office markup. Get clean plaintext — all in your browser.",
};

export default function ClipboardPage() {
  return <ClipboardCleaner />;
}
