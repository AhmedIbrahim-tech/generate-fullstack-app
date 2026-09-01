import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
};

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: EmptyStateProps) {
  return (
    <div className="ui-empty">
      <span className="ui-card-icon">
        <Icon size={16} />
      </span>
      <h3>{title}</h3>
      <p className="ui-note">{description}</p>
      {action}
    </div>
  );
}
