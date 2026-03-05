import { Metadata } from "next";
import HashCalculator from "@/components/tools/HashCalculator";

export const metadata: Metadata = {
  title: "Hash Calculator — ShipTools",
  description:
    "Compute MD5, SHA-1, SHA-256, and SHA-512 hashes for text or files. Verify checksums instantly — all in your browser.",
};

export default function HashPage() {
  return <HashCalculator />;
}
