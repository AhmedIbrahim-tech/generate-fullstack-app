import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { ApplicationConfig } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideEffects } from "@ngrx/effects";
import { provideStore } from "@ngrx/store";
import { provideStoreDevtools } from "@ngrx/store-devtools";
import { routes } from "./app.routes";
import { apiInterceptor } from "./core/interceptors/api.interceptor";
import { ExampleEffects } from "./features/example/store/example.effects";
import { exampleReducer } from "./features/example/store/example.reducer";

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([apiInterceptor])),
    provideStore({ example: exampleReducer }),
    provideEffects([ExampleEffects]),
    provideStoreDevtools({ maxAge: 25 }),
  ],
};
