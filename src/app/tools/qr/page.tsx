import { Metadata } from "next";
import QRGenerator from "@/components/tools/QRGenerator";

export const metadata: Metadata = {
  title: "QR Code Generator — ShipTools",
  description:
    "Generate QR codes for URLs, WiFi credentials, vCards, and plain text. Customize colors and download as PNG or SVG — all in your browser.",
};

export default function QRPage() {
  return <QRGenerator />;
}
