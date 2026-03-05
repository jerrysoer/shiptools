import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1 px-6 py-8">
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>
      <Footer />
    </>
  );
}
