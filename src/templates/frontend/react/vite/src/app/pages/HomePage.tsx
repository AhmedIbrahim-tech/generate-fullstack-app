import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { HomeLanding } from "@/shared/components/marketing/HomeLanding";
import type { AppLinkProps } from "@/shared/navigation/app-link";

function AppLink({ href, className, children, onClick }: AppLinkProps): ReactElement {
  return (
    <Link to={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

export function HomePage() {
  const { t } = useTranslation();

  return (
    <HomeLanding
      productName="__DISPLAY_NAME__"
      headline={t("home.title")}
      description={t("home.description")}
      primaryLabel={t("home.ctaPrimary")}
      secondaryLabel={t("home.ctaSecondary")}
      Link={AppLink}
    />
  );
}
