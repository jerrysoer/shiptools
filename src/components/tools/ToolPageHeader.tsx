import Link from "next/link";
import PrivacyBadge from "@/components/PrivacyBadge";

interface ToolPageHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  department?: string;
  departmentHref?: string;
}

export default function ToolPageHeader({
  icon: Icon,
  title,
  description,
  department,
  departmentHref,
}: ToolPageHeaderProps) {
  return (
    <div className="mb-8">
      {department && departmentHref && (
        <nav aria-label="Breadcrumb" className="mb-3">
          <p className="font-mono text-xs tracking-widest uppercase text-text-tertiary">
            <Link
              href={departmentHref}
              className="hover:text-text-secondary transition-colors"
            >
              {department}
            </Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-text-secondary">{title}</span>
          </p>
        </nav>
      )}
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-5 h-5 text-text-tertiary" />
        <h1 className="font-heading font-bold text-3xl">{title}</h1>
      </div>
      <p className="text-text-secondary mb-4">{description}</p>
      <PrivacyBadge />
      <hr className="editorial-rule mt-6" />
    </div>
  );
}
