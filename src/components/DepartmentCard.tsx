import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface DepartmentCardProps {
  number: string;
  name: string;
  toolCount: number;
  description: string;
  href: string;
  deptColor: string;
}

export default function DepartmentCard({
  number,
  name,
  toolCount,
  description,
  href,
  deptColor,
}: DepartmentCardProps) {
  return (
    <Link
      href={href}
      className="group block bg-bg-surface p-4 sm:p-6 rounded-lg border border-border shadow-sm transition-colors hover:bg-bg-elevated"
      style={{ borderLeft: `3px solid ${deptColor}` }}
    >
      <span
        className="font-mono text-xs tracking-widest uppercase"
        style={{ color: deptColor }}
      >
        No. {number}
      </span>
      <h3 className="font-heading text-xl sm:text-2xl font-semibold mt-1 mb-2">{name}</h3>
      <p className="text-text-secondary text-sm leading-relaxed mb-4">
        {description}
      </p>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">
          {toolCount} tools
        </span>
        <ArrowRight className="w-4 h-4 text-text-tertiary group-hover:text-accent group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  );
}
