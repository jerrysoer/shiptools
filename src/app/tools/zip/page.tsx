import { Metadata } from "next";
import ZipTool from "@/components/tools/ZipTool";

export const metadata: Metadata = {
  title: "ZIP / Unzip — ShipTools",
  description:
    "Create and extract ZIP archives entirely in your browser. Browse file trees, download individual files. No uploads, no tracking.",
};

export default function ZipPage() {
  return <ZipTool />;
}
