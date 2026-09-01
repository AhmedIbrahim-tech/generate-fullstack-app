import { getTranslations } from "next-intl/server";
import { HomeLanding } from "@/shared/components/marketing/HomeLanding";
import { AppLink } from "@/app/navigation/app-link";

export default async function HomePage() {
  const t = await getTranslations("home");

  return (
    <HomeLanding
      productName="__DISPLAY_NAME__"
      headline={t("title")}
      description={t("description")}
      primaryLabel={t("ctaPrimary")}
      secondaryLabel={t("ctaSecondary")}
      Link={AppLink}
    />
  );
}
