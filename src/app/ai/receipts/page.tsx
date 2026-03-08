import { redirect } from "next/navigation";

export default function ReceiptsPage() {
  redirect("/ai/image-scanner?mode=parse-receipt");
}
