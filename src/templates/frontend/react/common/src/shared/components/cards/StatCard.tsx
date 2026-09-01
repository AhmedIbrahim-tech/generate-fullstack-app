import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
};

export function StatCard({ label, value, hint, icon: Icon }: StatCardProps) {
  return (
    <article className="ui-card ui-stat">
      {Icon ? (
        <span className="ui-card-icon">
          <Icon size={16} />
        </span>
      ) : null}
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <span>{hint}</span> : null}
    </article>
  );
}
