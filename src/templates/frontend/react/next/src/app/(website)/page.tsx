import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function HomePage() {
  const t = await getTranslations("home");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p className="text-lg text-zinc-600">{t("description")}</p>
      <p className="text-sm text-zinc-500">
        Public SEO pages may use Server Components with{" "}
        <code>server-api.ts</code>. Interactive and dashboard state continues
        through Redux Toolkit async thunks.
      </p>
      <nav className="flex gap-4 text-sm">
        <Link className="underline" href="/examples">
          Example module
        </Link>
        <Link className="underline" href="/login">
          Auth
        </Link>
      </nav>
    </main>
  );
}
