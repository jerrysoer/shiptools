import { redirect } from "next/navigation";

export default function OCRPage() {
  redirect("/ai/image-scanner?mode=extract-text");
}
