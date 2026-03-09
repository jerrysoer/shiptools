import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1 px-6 py-8">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
      <Footer />
    </>
  );
}
