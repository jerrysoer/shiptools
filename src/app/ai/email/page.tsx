import { redirect } from "next/navigation";

export default function EmailPage() {
  redirect("/ai/writer?mode=email");
}
