import { redirect } from "next/navigation";

export default function MeetingMinutesPage() {
  redirect("/ai/analyze?mode=meeting");
}
