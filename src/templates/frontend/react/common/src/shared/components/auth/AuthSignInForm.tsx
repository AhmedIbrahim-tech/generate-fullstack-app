"use client";

import { useState, type FormEvent } from "react";
import type { ReactElement } from "react";
import type { AppLinkProps } from "@/shared/navigation/app-link";

type AuthSignInFormProps = {
  Link: (props: AppLinkProps) => ReactElement;
};

export function AuthSignInForm({ Link }: AuthSignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setError(null);
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setLoading(false);
    setNotice("Enable the auth module to connect this form to Identity.");
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
      <label className="ui-field">
        Password
        <input
          className="ui-input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error ? <p className="ui-error-text">{error}</p> : null}
      {notice ? <p className="ui-note">{notice}</p> : null}
      <button className="ui-btn ui-btn-primary" type="submit" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <p className="ui-form-foot">
        Need an account? <Link href="/register">Create one</Link>
        <br />
        <Link href="/forgot-password">Forgot password</Link>
      </p>
    </form>
  );
}
