import { Metadata } from "next";
import EmailHeaderAnalyzer from "@/components/tools/EmailHeaderAnalyzer";

export const metadata: Metadata = {
  title: "Email Header Analyzer — ShipLocal",
  description:
    "Parse raw email headers to trace server hops, verify SPF/DKIM/DMARC, and inspect routing. All in your browser.",
};

export default function EmailHeadersPage() {
  return <EmailHeaderAnalyzer />;
}
