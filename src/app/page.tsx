import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-zinc-50 dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-700 dark:text-brand-400">
          FinanceFlow
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
          Spending clarity and a path to eliminate debt
        </h1>
        <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-300">
          Upload bank statement PDFs—no bank logins. See income, categorized spending, and optional snowball or
          avalanche payoff plans. Your raw PDFs are discarded after parsing; only structured data is kept.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-700"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Sign in
          </Link>
        </div>
        <p className="mt-8 text-sm text-zinc-500">$5/month subscription · No payment credentials stored</p>
      </div>
    </div>
  );
}
