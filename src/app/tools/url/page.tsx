import { Metadata } from "next";
import UrlParser from "@/components/tools/UrlParser";

export const metadata: Metadata = {
  title: "URL Parser — ShipLocal",
  description:
    "Parse URLs into protocol, host, port, path, query parameters, and hash. Encode and decode URLs. All processing happens locally in your browser.",
};

export default function UrlPage() {
  return <UrlParser />;
}
