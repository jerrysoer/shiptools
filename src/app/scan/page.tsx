import { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DocumentScanner from "@/components/recording/DocumentScanner";

export const metadata: Metadata = {
  title: "Document Scanner — ShipLocal",
  description:
    "Scan documents to PDF with your camera. Edge detection, perspective correction, and OCR.",
};

export default function ScanPage() {
  return (
    <>
      <Header />
      <main className="flex-1 px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <DocumentScanner />
        </div>
      </main>
      <Footer />
    </>
  );
}
