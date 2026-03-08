import { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Code & Development — Uploadless",
  description:
    "29 developer and AI code tools that run entirely in your browser. Review, generate, format, encode, deploy — no uploads, no tracking.",
};

export default function ToolsLayout({
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
