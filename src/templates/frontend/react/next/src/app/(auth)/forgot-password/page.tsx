import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Reset your password</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Enter your email address and we'll send you a password reset link.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email address</label>
          <input
            type="email"
            placeholder="you@example.com"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
        <button
          type="button"
          className="w-full rounded-md bg-zinc-900 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Send Reset Link
        </button>
      </div>

      <div className="text-center text-xs text-zinc-500">
        <Link href="/login" className="font-semibold text-zinc-900 underline hover:text-zinc-700 dark:text-zinc-100">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
