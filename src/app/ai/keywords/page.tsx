import { redirect } from "next/navigation";

export default function KeywordsPage() {
  redirect("/ai/analyze?mode=keywords");
}
