"use client";

import Link from "next/link";
import { SquareSlash, ArrowLeftRight, Wrench, Sparkles, Mic } from "lucide-react";
import { usePathname } from "next/navigation";
import AIStatusBadge from "@/components/AIStatusBadge";
import ThemeToggle from "@/components/ThemeToggle";

export default function Header() {
  const pathname = usePathname();
  const isConvert = pathname.startsWith("/convert");
  const isRecord = pathname.startsWith("/record") || pathname.startsWith("/scan");
  const isTools = pathname.startsWith("/tools");
  const isAI = pathname.startsWith("/ai");

  return (
    <header className="border-b border-border px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <SquareSlash className="w-6 h-6 text-accent" />
          <span className="font-heading font-bold text-lg">ShipLocal</span>
        </Link>

        <nav className="flex items-center gap-1">
          <AIStatusBadge />
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
            href="/record"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isRecord
                ? "bg-bg-elevated text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Mic className="w-4 h-4" />
              Record
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
          <Link
            href="/ai"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isAI
                ? "bg-bg-elevated text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              AI
            </span>
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
