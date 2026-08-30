import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isAppLocale, localeCookieName } from "./config";

export default getRequestConfig(async () => {
  const store = await cookies();
  const candidate = store.get(localeCookieName)?.value;
  const locale = isAppLocale(candidate) ? candidate : defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
