import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function HomePage() {
  const { t } = useTranslation();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold">{t("home.title")}</h1>
      <p className="text-lg text-zinc-600">{t("home.description")}</p>
      <p className="text-sm text-zinc-500">
        This Vite app is a client-side SPA. Interactive state uses Redux Toolkit
        async thunks. There are no Server Components.
      </p>
      <Link className="underline" to="/examples">
        Example module
      </Link>
    </main>
  );
}
