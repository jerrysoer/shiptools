import { Metadata } from "next";
import Base64Tool from "@/components/tools/Base64Tool";

export const metadata: Metadata = {
  title: "Base64 Encode/Decode — ShipTools",
  description:
    "Encode and decode Base64 for text and files. Auto-detect direction. All processing happens locally in your browser.",
};

export default function Base64Page() {
  return <Base64Tool />;
}
