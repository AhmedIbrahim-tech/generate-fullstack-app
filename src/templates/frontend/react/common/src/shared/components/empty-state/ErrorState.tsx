import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";

type ErrorStateProps = {
  title?: string;
  description: string;
  action?: ReactNode;
};

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
}: ErrorStateProps) {
  return (
    <div className="ui-error" role="alert">
      <span className="ui-card-icon">
        <CircleAlert size={16} />
      </span>
      <h3>{title}</h3>
      <p className="ui-note">{description}</p>
      {action}
    </div>
  );
}
