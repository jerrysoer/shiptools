import { redirect } from "next/navigation";

export default function JobAnalyzerPage() {
  redirect("/ai/analyze?mode=job");
}
