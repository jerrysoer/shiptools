import { Metadata } from "next";
import DocumentRedactor from "@/components/tools/DocumentRedactor";

export const metadata: Metadata = {
  title: "Document Redactor — ShipLocal",
  description:
    "Detect and redact sensitive data in PDFs — emails, phone numbers, SSNs, credit cards. All processing happens in your browser.",
};

export default function RedactPage() {
  return <DocumentRedactor />;
}
