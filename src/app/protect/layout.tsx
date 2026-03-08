import { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Security & Privacy — Uploadless",
  description:
    "Encrypt files, decode JWTs, strip metadata, detect tracking, and audit privacy. All tools run locally in your browser.",
};

export default function ProtectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1 px-6 py-8">
        <div className="max-w-3xl mx-auto">{children}</div>
      </main>
      <Footer />
    </>
  );
}
