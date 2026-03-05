import { Metadata } from "next";
import ConverterTabs from "@/components/ConverterTabs";
import DocumentConverter from "@/components/DocumentConverter";

export const metadata: Metadata = {
  title: "Document Converter — ShipTools",
  description: "Convert documents between DOCX, PDF, XLSX, TXT, CSV, JSON. All processing happens locally in your browser.",
};

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <ConverterTabs />
      <div>
        <h1 className="font-heading font-bold text-2xl mb-1">Document Converter</h1>
        <p className="text-text-secondary text-sm">
          Convert between document formats. DOCX, PDF, XLSX, CSV, JSON, TXT.
        </p>
      </div>
      <DocumentConverter />
    </div>
  );
}
