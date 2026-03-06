import { Metadata } from "next";
import BaseConverter from "@/components/tools/BaseConverter";

export const metadata: Metadata = {
  title: "Number Base Converter — ShipLocal",
  description:
    "Convert numbers between binary, octal, decimal, and hexadecimal in real time. All processing happens locally in your browser.",
};

export default function BaseConvertPage() {
  return <BaseConverter />;
}
