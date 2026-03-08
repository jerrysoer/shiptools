import { redirect } from "next/navigation";

export default function LongDocPage() {
  redirect("/ai/summarize?mode=long-document");
}
