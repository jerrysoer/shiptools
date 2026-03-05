"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Image, FileText, Music, Video } from "lucide-react";

const TABS = [
  { href: "/convert/images", label: "Images", icon: Image },
  { href: "/convert/documents", label: "Documents", icon: FileText },
  { href: "/convert/audio", label: "Audio", icon: Music },
  { href: "/convert/video", label: "Video", icon: Video },
] as const;

export default function ConverterTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 bg-bg-surface border border-border rounded-xl p-1">
      {TABS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-bg-elevated text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
