import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { ApplicationConfig } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideEffects } from "@ngrx/effects";
import { provideStore } from "@ngrx/store";
import { provideStoreDevtools } from "@ngrx/store-devtools";
import { routes } from "./app.routes";
import { apiInterceptor } from "./core/interceptors/api.interceptor";
import { CategoryEffects } from "./features/category/store/category.effects";
import { categoryReducer } from "./features/category/store/category.reducer";

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([apiInterceptor])),
    provideStore({ category: categoryReducer }),
    provideEffects([CategoryEffects]),
    provideStoreDevtools({ maxAge: 25 }),
  ],
};
