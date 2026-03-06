import { Metadata } from "next";
import ChmodCalculator from "@/components/tools/ChmodCalculator";

export const metadata: Metadata = {
  title: "Chmod Calculator — ShipLocal",
  description:
    "Calculate Unix file permissions with a visual checkbox grid. Get numeric and symbolic notation instantly. All processing happens locally in your browser.",
};

export default function ChmodPage() {
  return <ChmodCalculator />;
}
