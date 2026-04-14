"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accountAlreadyExists, setAccountAlreadyExists] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setAccountAlreadyExists(false);
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 409) {
        setAccountAlreadyExists(true);
        setErr(null);
      } else {
        setErr(data.error ?? "Could not register.");
      }
      setLoading(false);
      return;
    }
    const sign = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/onboarding",
    });
    setLoading(false);
    if (sign?.error) setErr("Account created but sign-in failed. Try logging in.");
    else if (sign?.url) window.location.href = sign.url;
    else window.location.href = "/onboarding";
  }

  const loginHref =
    `/login?email=${encodeURIComponent(email.trim())}` +
    `&callbackUrl=${encodeURIComponent("/onboarding")}&from=signup`;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Create your account</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Password must be 12+ characters with numbers and symbols. Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-700 dark:text-brand-400">
          Sign in
        </Link>
      </p>

      {accountAlreadyExists && (
        <div
          className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/40"
          role="alert"
        >
          <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
            An account with this email already exists.
          </p>
          <p className="mt-2 text-sm text-amber-900/90 dark:text-amber-200/90">
            Sign in with your existing password instead of creating a new account.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href={email.trim() ? loginHref : "/login?from=signup"}
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700"
            >
              Sign in{email.trim() ? " with this email" : ""}
            </Link>
            <button
              type="button"
              onClick={() => {
                setAccountAlreadyExists(false);
                setPassword("");
              }}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Try a different email
            </button>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Name (optional)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={accountAlreadyExists}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={accountAlreadyExists}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={accountAlreadyExists}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
        <button
          type="submit"
          disabled={loading || accountAlreadyExists}
          className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
