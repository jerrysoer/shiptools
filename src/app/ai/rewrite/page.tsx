import { redirect } from "next/navigation";

export default function RewritePage() {
  redirect("/ai/writer?mode=rewrite");
}
