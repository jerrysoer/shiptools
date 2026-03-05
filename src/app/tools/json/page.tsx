import { Metadata } from "next";
import JsonFormatter from "@/components/tools/JsonFormatter";

export const metadata: Metadata = {
  title: "JSON Formatter & Validator — ShipTools",
  description:
    "Format, minify, validate, and convert JSON to CSV or YAML. Tree view with collapsible nodes — all in your browser.",
};

export default function JsonPage() {
  return <JsonFormatter />;
}
