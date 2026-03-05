import PrivacyBadge from "@/components/PrivacyBadge";

interface ToolPageHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export default function ToolPageHeader({
  icon: Icon,
  title,
  description,
}: ToolPageHeaderProps) {
  return (
    <div className="text-center mb-8">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/10 mb-4">
        <Icon className="w-6 h-6 text-accent" />
      </div>
      <h1 className="font-heading font-bold text-3xl mb-2">{title}</h1>
      <p className="text-text-secondary mb-4">{description}</p>
      <PrivacyBadge />
    </div>
  );
}
