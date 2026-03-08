import { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Media & Files — Uploadless",
  description:
    "Record, convert, and create media assets. Images, audio, video, documents — all processed locally in your browser.",
};

export default function MediaLayout({
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
