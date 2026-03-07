import { redirect } from "next/navigation";

export default function VoiceMemoPage() {
  redirect("/record/audio");
}
