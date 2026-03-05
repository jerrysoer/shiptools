"use client";

import Link from "next/link";
import { SquareSlash, ArrowLeftRight, Wrench, Shield } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const isConvert = pathname.startsWith("/convert");
  const isTools = pathname.startsWith("/tools");
  const isAudit = !isConvert && !isTools;

  return (
    <header className="border-b border-border px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <SquareSlash className="w-6 h-6 text-accent" />
          <span className="font-heading font-bold text-lg">ShipTools</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isAudit
                ? "bg-bg-elevated text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              Audit
            </span>
          </Link>
          <Link
            href="/convert"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isConvert
                ? "bg-bg-elevated text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <ArrowLeftRight className="w-4 h-4" />
              Convert
            </span>
          </Link>
          <Link
            href="/tools"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isTools
                ? "bg-bg-elevated text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Wrench className="w-4 h-4" />
              Tools
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
