import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { APP_CONFIG_TOKEN } from "../config/app-config.token";
import { I18nService } from "../services/i18n.service";

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(APP_CONFIG_TOKEN);
  const i18n = inject(I18nService);
  const url = req.url.startsWith("http") ? req.url : `${config.apiUrl}${req.url}`;

  return next(
    req.clone({
      url,
      withCredentials: true,
      setHeaders: {
        Accept: "application/json",
        "Accept-Language": i18n.locale(),
      },
    }),
  );
};
