import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Workflow } from "@/data/workflows";

export default function WorkflowCard({ number, title, summary, tools, deptColor }: Workflow) {
  return (
    <div
      className="group relative flex-shrink-0 w-[280px] sm:w-[320px] bg-bg-surface p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg snap-start"
      style={{ borderLeft: `3px solid ${deptColor}` }}
    >
      <span className="font-mono text-xs tracking-widest text-text-tertiary uppercase">
        Workflow {number}
      </span>
      <h3 className="font-heading font-semibold text-lg mt-1 mb-4">{title}</h3>

      {/* Tool chain */}
      <div className="flex items-center gap-2 mb-4">
        {tools.map((tool, i) => (
          <div key={tool.href} className="flex items-center gap-2">
            <Link
              href={tool.href}
              className="p-2 bg-bg-elevated hover:bg-bg-hover transition-colors"
              title={tool.name}
            >
              <tool.icon className="w-4 h-4 text-text-secondary" />
            </Link>
            {i < tools.length - 1 && (
              <ArrowRight className="w-3 h-3 text-text-tertiary flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      <p className="text-text-secondary text-sm italic">{summary}</p>
    </div>
  );
}
