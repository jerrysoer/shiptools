import { Metadata } from "next";
import { FileSignature } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import PDFSigner from "@/components/PDFSigner";

export const metadata: Metadata = {
  title: "Sign PDFs — ShipTools",
  description:
    "Sign PDFs, fill form fields, and add text annotations — entirely in your browser. No server, no account, no uploads.",
};

export default function SignPage() {
  return (
    <div className="space-y-6">
      <ToolPageHeader
        icon={FileSignature}
        title="PDF Sign & Fill"
        description="Add signatures, text, and dates to any PDF. Draw, type, or upload your signature. Everything stays in your browser."
      />
      <PDFSigner />
    </div>
  );
}
