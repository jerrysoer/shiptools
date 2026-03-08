import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Design Editor — Uploadless",
  description:
    "Create social media graphics with a fast, private design editor. Templates, fonts, shapes, background removal — zero uploads.",
};

export default function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </>
  );
}
