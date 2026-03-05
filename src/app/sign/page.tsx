import { Metadata } from "next";
import PDFSigner from "@/components/PDFSigner";

export const metadata: Metadata = {
  title: "Sign PDFs — ShipTools",
  description:
    "Sign PDFs, fill form fields, and add text annotations — entirely in your browser. No server, no account, no uploads.",
};

export default function SignPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl mb-1">PDF Sign & Fill</h1>
        <p className="text-text-secondary text-sm">
          Add signatures, text, and dates to any PDF. Draw, type, or upload your signature.
          Everything stays in your browser.
        </p>
      </div>
      <PDFSigner />
    </div>
  );
}
