import { redirect } from "next/navigation";

export default function SWOTPage() {
  redirect("/ai/analyze?mode=swot");
}
