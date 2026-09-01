"use client";

import { useState, type FormEvent } from "react";
import type { ReactElement } from "react";
import type { AppLinkProps } from "@/shared/navigation/app-link";

type AuthForgotPasswordFormProps = {
  Link: (props: AppLinkProps) => ReactElement;
};

export function AuthForgotPasswordForm({ Link }: AuthForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    if (!email.trim()) {
      setError("Enter the email associated with your account.");
      return;
    }
    setError(null);
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setLoading(false);
    setNotice("Enable the auth module to send a reset email.");
  }

  return (
    <form className="ui-form-stack" onSubmit={onSubmit} noValidate>
      <label className="ui-field">
        Email
        <input
          className="ui-input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      {error ? <p className="ui-error-text">{error}</p> : null}
      {notice ? <p className="ui-note">{notice}</p> : null}
      <button className="ui-btn ui-btn-primary" type="submit" disabled={loading}>
        {loading ? "Sending…" : "Send reset link"}
      </button>
      <p className="ui-form-foot">
        <Link href="/login">Back to sign in</Link>
      </p>
    </form>
  );
}
