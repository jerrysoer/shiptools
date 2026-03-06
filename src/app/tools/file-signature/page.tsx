import { Metadata } from "next";
import FileSignatureChecker from "@/components/tools/FileSignatureChecker";

export const metadata: Metadata = {
  title: "File Signature Checker — ShipLocal",
  description:
    "Verify file types by inspecting magic bytes. Detect extension mismatches and view hex dumps. All in your browser.",
};

export default function FileSignaturePage() {
  return <FileSignatureChecker />;
}
