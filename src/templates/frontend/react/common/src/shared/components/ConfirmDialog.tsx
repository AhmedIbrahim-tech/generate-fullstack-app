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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-zinc-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-zinc-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="rounded bg-red-600 px-3 py-1.5 text-sm text-white"
            onClick={onConfirm}
          >
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
