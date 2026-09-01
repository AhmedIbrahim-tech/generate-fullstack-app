"use client";

import { useState, type FormEvent } from "react";
import type { ReactElement } from "react";
import type { AppLinkProps } from "@/shared/navigation/app-link";

type AuthRegisterFormProps = {
  Link: (props: AppLinkProps) => ReactElement;
};

export function AuthRegisterForm({ Link }: AuthRegisterFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    if (!name.trim() || !email.trim() || password.length < 8) {
      setError("Name, email, and an 8+ character password are required.");
      return;
    }
    setError(null);
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setLoading(false);
    setNotice("Enable the auth module to create real accounts.");
  }

  return (
    <form className="ui-form-stack" onSubmit={onSubmit} noValidate>
      <label className="ui-field">
        Name
        <input
          className="ui-input"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
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
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error ? <p className="ui-error-text">{error}</p> : null}
      {notice ? <p className="ui-note">{notice}</p> : null}
      <button className="ui-btn ui-btn-primary" type="submit" disabled={loading}>
        {loading ? "Creating account…" : "Create account"}
      </button>
      <p className="ui-form-foot">
        Already registered? <Link href="/login">Sign in</Link>
      </p>
    </form>
  );
}
