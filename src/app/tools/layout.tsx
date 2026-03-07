import { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Tool Hub — BrowserShip",
  description:
    "62 developer, AI, and privacy tools that run entirely in your browser. Hash, encode, encrypt, generate, review code, analyze documents — no uploads, no tracking.",
};

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1 px-6 py-8">
        <div className="max-w-3xl mx-auto">{children}</div>
      </main>
      <Footer />
    </>
  );
}
