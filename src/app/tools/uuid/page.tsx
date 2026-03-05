import { Metadata } from "next";
import UuidGenerator from "@/components/tools/UuidGenerator";

export const metadata: Metadata = {
  title: "UUID Generator — ShipTools",
  description:
    "Generate v4 UUIDs in bulk with format options. Cryptographically secure, runs entirely in your browser.",
};

export default function UuidPage() {
  return <UuidGenerator />;
}
