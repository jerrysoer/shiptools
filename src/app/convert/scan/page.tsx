import { Metadata } from "next";
import DocumentScanner from "@/components/recording/DocumentScanner";

export const metadata: Metadata = {
  title: "Document Scanner — ShipLocal",
  description:
    "Scan documents to PDF with your camera. Edge detection, perspective correction, and OCR.",
};

export default function ScanPage() {
  return <DocumentScanner />;
}
