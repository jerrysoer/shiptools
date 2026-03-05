import { Metadata } from "next";
import PdfMergeSplit from "@/components/tools/PdfMergeSplit";

export const metadata: Metadata = {
  title: "PDF Merge & Split — ShipTools",
  description:
    "Merge multiple PDFs into one or split a PDF by page ranges. All processing happens locally in your browser.",
};

export default function PdfToolsPage() {
  return <PdfMergeSplit />;
}
