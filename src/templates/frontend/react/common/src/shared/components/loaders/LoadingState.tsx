type LoadingStateProps = {
  title?: string;
  description?: string;
};

export function LoadingState({
  title = "Loading",
  description = "Fetching the latest data…",
}: LoadingStateProps) {
  return (
    <div className="ui-loading" role="status" aria-live="polite">
      <span className="ui-spinner" aria-hidden="true" />
      <h3>{title}</h3>
      <p className="ui-note">{description}</p>
    </div>
  );
}
