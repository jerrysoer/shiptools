import { SquareSlash } from "lucide-react";
import AnalyticsStatus from "@/components/AnalyticsStatus";

export default function Footer() {
  return (
    <footer className="border-t border-border mt-auto px-6 py-8">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-text-tertiary text-sm">
        <div className="flex items-center gap-2">
          <SquareSlash className="w-4 h-4" />
          <span>ShipTools — Privacy-first tools for the web</span>
        </div>
        <div className="flex items-center gap-4">
          <span>No tracking. No uploads. No cookies.</span>
          <AnalyticsStatus />
        </div>
      </div>
    </footer>
  );
}
