import { redirect } from "next/navigation";

export default function SentimentPage() {
  redirect("/ai/analyze?mode=sentiment");
}
