export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="text-zinc-600">
        Authentication is intentionally not implemented in this starter phase.
        Identity + JWT packages are installed on the API so a later phase can
        wire login, cookies, and protected routes.
      </p>
    </main>
  );
}
