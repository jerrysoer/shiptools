import { Metadata } from "next";
import CodeScreenshot from "@/components/tools/CodeScreenshot";

export const metadata: Metadata = {
  title: "Code Screenshot — ShipLocal",
  description:
    "Create beautiful code screenshots with syntax highlighting, custom themes, and padding options.",
};

export default function CodeScreenshotPage() {
  return <CodeScreenshot />;
}
