"use client";

import { useState, type ReactNode } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="ui-dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="ui-dialog">
        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{message}</p>
        <div className="ui-dialog-actions">
          <button type="button" className="ui-btn ui-btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="ui-btn ui-btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirmDialog() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    message: string;
    resolve: ((value: boolean) => void) | null;
  }>({
    open: false,
    title: "",
    message: "",
    resolve: null,
  });

  function confirm(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      setState({ open: true, title, message, resolve });
    });
  }

  const dialog: ReactNode = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      onCancel={() => {
        state.resolve?.(false);
        setState((current) => ({ ...current, open: false, resolve: null }));
      }}
      onConfirm={() => {
        state.resolve?.(true);
        setState((current) => ({ ...current, open: false, resolve: null }));
      }}
    />
  );

  return { confirm, dialog };
}
