import path from 'node:path';

/**
 * V4 Authentication — Angular module generator.
 *
 * Security model (mirrors the React generator):
 *  - The access token lives in RUNTIME MEMORY ONLY (NgRx state + a signal-backed
 *    `AuthTokenStore` read synchronously by the interceptor). It is never
 *    persisted to localStorage/sessionStorage.
 *  - The refresh token is an HttpOnly cookie sent via `withCredentials`.
 *  - `RefreshClient` builds an `HttpClient` from `HttpBackend`, which bypasses
 *    ALL interceptors — the refresh call can therefore never recurse through the
 *    401-refresh interceptor.
 *  - A shared `AuthRefreshCoordinator` performs a single-flight refresh so a
 *    burst of concurrent 401s only triggers one refresh.
 *  - `provideAppInitializer` performs one silent refresh at startup; anonymous
 *    visitors are handled quietly (no toast).
 *
 * @param {{ frontendStrategy?: { library?: string, framework?: string }, projectName?: string }} config
 * @returns {{
 *   files: { relativePath: string, contents: string, writeMode?: string }[],
 *   registryUpdates: { relativePath: string, update: (existing: string) => string }[],
 * }}
 */
export function planAuthAngularModule(config) {
  void config;
  const coreBase = path.join('Client', 'src', 'app', 'core', 'auth');
  const authFeatureBase = path.join('Client', 'src', 'app', 'features', 'auth');

  /** @type {{ relativePath: string, contents: string, writeMode?: string }[]} */
  const files = [
    { relativePath: path.join(coreBase, 'auth.models.ts'), contents: renderModels() },
    { relativePath: path.join(coreBase, 'refresh-client.ts'), contents: renderRefreshClient() },
    { relativePath: path.join(coreBase, 'auth.service.ts'), contents: renderService() },
    { relativePath: path.join(coreBase, 'auth.token-store.ts'), contents: renderTokenStore() },
    { relativePath: path.join(coreBase, 'auth.state.ts'), contents: renderState() },
    { relativePath: path.join(coreBase, 'auth.actions.ts'), contents: renderActions() },
    { relativePath: path.join(coreBase, 'auth.reducer.ts'), contents: renderReducer() },
    { relativePath: path.join(coreBase, 'auth.effects.ts'), contents: renderEffects() },
    { relativePath: path.join(coreBase, 'auth.selectors.ts'), contents: renderSelectors() },
    {
      relativePath: path.join(coreBase, 'auth.refresh-coordinator.ts'),
      contents: renderRefreshCoordinator(),
    },
    { relativePath: path.join(coreBase, 'auth.interceptor.ts'), contents: renderInterceptor() },
    { relativePath: path.join(coreBase, 'auth.guard.ts'), contents: renderAuthGuard() },
    { relativePath: path.join(coreBase, 'permission.guard.ts'), contents: renderPermissionGuard() },
    { relativePath: path.join(coreBase, 'auth.providers.ts'), contents: renderProviders() },
    {
      relativePath: path.join(authFeatureBase, 'login.page.ts'),
      contents: renderLoginPage(),
      writeMode: 'replace',
    },
    {
      relativePath: path.join(authFeatureBase, 'register.page.ts'),
      contents: renderRegisterPage(),
      writeMode: 'replace',
    },
  ];

  /** @type {{ relativePath: string, update: (existing: string) => string }[]} */
  const registryUpdates = [
    {
      relativePath: path.join('Client', 'src', 'app', 'app.config.ts'),
      update: (existing) => buildAngularAppConfigUpdate(existing),
    },
    {
      relativePath: path.join('Client', 'src', 'app', 'app.routes.ts'),
      update: (existing) => buildAngularRoutesGuardUpdate(existing),
    },
  ];

  return { files, registryUpdates };
}

// ===========================================================================
// Registry patchers
// ===========================================================================

/**
 * Idempotently wires the auth interceptor and `provideAuth()` into the
 * generated `app.config.ts`.
 * @param {string} existing
 * @returns {string}
 */
export function buildAngularAppConfigUpdate(existing) {
  if (!existing || !existing.includes('withInterceptors(')) {
    return existing;
  }
  if (existing.includes('...provideAuth()')) {
    return existing;
  }

  let content = existing;
  content = ensureImport(
    content,
    'import { authInterceptor } from "./core/auth/auth.interceptor";',
  );
  content = ensureImport(
    content,
    'import { provideAuth } from "./core/auth/auth.providers";',
  );

  content = content.replace(/withInterceptors\(\[([^\]]*)\]\)/, (match, inner) => {
    const items = String(inner)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (!items.includes('authInterceptor')) {
      items.push('authInterceptor');
    }
    return `withInterceptors([${items.join(', ')}])`;
  });

  content = content.replace(
    /(providers:\s*\[)(\r?\n)/,
    (match, open, newline) => `${open}${newline}    ...provideAuth(),${newline}`,
  );

  return content;
}

/**
 * Idempotently guards the dashboard route tree with `authGuard`.
 * @param {string} existing
 * @returns {string}
 */
export function buildAngularRoutesGuardUpdate(existing) {
  if (!existing || existing.includes('authGuard')) {
    return existing;
  }
  if (!existing.includes('DashboardLayoutComponent')) {
    return existing;
  }

  let content = ensureImport(
    existing,
    'import { authGuard } from "./core/auth/auth.guard";',
  );

  content = content.replace(
    /(path:\s*"dashboard",\r?\n\s*component:\s*DashboardLayoutComponent,)(\r?\n)/,
    (match, head, newline) => `${head}${newline}    canActivate: [authGuard],${newline}`,
  );

  return content;
}

// ===========================================================================
// core/auth file renderers
// ===========================================================================

function renderModels() {
  return `export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  displayName: string;
  password: string;
};

/**
 * Login/refresh responses carry the access token in the body (kept in memory
 * only). The refresh token is set separately as an HttpOnly cookie by the API.
 */
export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export const AUTH_API_ROUTES = {
  login: "/api/v1/Auth/Login",
  register: "/api/v1/Auth/Register",
  refresh: "/api/v1/Auth/Refresh",
  logout: "/api/v1/Auth/Logout",
  me: "/api/v1/Auth/Me",
} as const;
`;
}

function renderRefreshClient() {
  return `import { HttpBackend, HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { APP_CONFIG_TOKEN } from "../config/app-config.token";
import { AUTH_API_ROUTES, type AuthResponse } from "./auth.models";

/**
 * Refresh transport built directly on \`HttpBackend\`, which BYPASSES every
 * HTTP interceptor (including the 401-refresh interceptor). This is what makes
 * the refresh call recursion-proof. \`withCredentials\` sends the HttpOnly
 * refresh cookie.
 */
@Injectable({ providedIn: "root" })
export class RefreshClient {
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly config = inject(APP_CONFIG_TOKEN);

  refresh(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      \`\${this.config.apiUrl}\${AUTH_API_ROUTES.refresh}\`,
      {},
      { withCredentials: true },
    );
  }
}
`;
}

function renderService() {
  return `import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import {
  AUTH_API_ROUTES,
  type AuthResponse,
  type AuthUser,
  type LoginRequest,
  type RegisterRequest,
} from "./auth.models";

/**
 * Login/register/logout/me all flow through the global \`apiInterceptor\`, which
 * prefixes the API base URL and sets \`withCredentials\`. Refresh is handled
 * separately by \`RefreshClient\` / \`AuthRefreshCoordinator\`.
 */
@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly http = inject(HttpClient);

  login(input: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(AUTH_API_ROUTES.login, input);
  }

  register(input: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(AUTH_API_ROUTES.register, input);
  }

  logout(): Observable<void> {
    return this.http.post<void>(AUTH_API_ROUTES.logout, {});
  }

  me(): Observable<AuthUser> {
    return this.http.get<AuthUser>(AUTH_API_ROUTES.me);
  }
}
`;
}

function renderTokenStore() {
  return `import { Injectable, signal } from "@angular/core";

/**
 * Runtime-memory holder for the access token. The interceptor reads it
 * synchronously on every request. Cleared on logout / session expiry. It is
 * never persisted to storage.
 */
@Injectable({ providedIn: "root" })
export class AuthTokenStore {
  private readonly accessToken = signal<string | null>(null);

  readonly token = this.accessToken.asReadonly();

  set(token: string | null): void {
    this.accessToken.set(token);
  }

  clear(): void {
    this.accessToken.set(null);
  }
}
`;
}

function renderState() {
  return `import type { AuthUser } from "./auth.models";

export const authFeatureKey = "auth";

export type AuthStatus = "idle" | "loading" | "succeeded" | "failed";

export type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  status: AuthStatus;
  error: string | null;
};

export const initialAuthState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitialized: false,
  status: "idle",
  error: null,
};
`;
}

function renderActions() {
  return `import { createActionGroup, emptyProps, props } from "@ngrx/store";
import type {
  AuthResponse,
  AuthUser,
  LoginRequest,
  RegisterRequest,
} from "./auth.models";

export const AuthActions = createActionGroup({
  source: "Auth",
  events: {
    Login: props<{ credentials: LoginRequest }>(),
    "Login Success": props<{ response: AuthResponse }>(),
    "Login Failure": props<{ error: string }>(),
    Register: props<{ input: RegisterRequest }>(),
    "Register Success": props<{ response: AuthResponse }>(),
    "Register Failure": props<{ error: string }>(),
    "Refresh Success": props<{ response: AuthResponse }>(),
    "Load Current User": emptyProps(),
    "Load Current User Success": props<{ user: AuthUser }>(),
    "Load Current User Failure": props<{ error: string }>(),
    Logout: emptyProps(),
    "Session Expired": emptyProps(),
    "Set Initialized": emptyProps(),
    "Clear Error": emptyProps(),
  },
});
`;
}

function renderReducer() {
  return `import { createReducer, on } from "@ngrx/store";
import { AuthActions } from "./auth.actions";
import { initialAuthState } from "./auth.state";

export const authReducer = createReducer(
  initialAuthState,
  on(AuthActions.login, AuthActions.register, (state) => ({
    ...state,
    status: "loading" as const,
    error: null,
  })),
  on(
    AuthActions.loginSuccess,
    AuthActions.registerSuccess,
    AuthActions.refreshSuccess,
    (state, { response }) => ({
      ...state,
      status: "succeeded" as const,
      user: response.user,
      accessToken: response.accessToken,
      isAuthenticated: true,
      isInitialized: true,
      error: null,
    }),
  ),
  on(AuthActions.loginFailure, AuthActions.registerFailure, (state, { error }) => ({
    ...state,
    status: "failed" as const,
    error,
  })),
  on(AuthActions.loadCurrentUserSuccess, (state, { user }) => ({
    ...state,
    user,
    isAuthenticated: state.accessToken != null,
  })),
  on(AuthActions.logout, AuthActions.sessionExpired, (state) => ({
    ...state,
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isInitialized: true,
    status: "idle" as const,
  })),
  on(AuthActions.setInitialized, (state) => ({
    ...state,
    isInitialized: true,
  })),
  on(AuthActions.clearError, (state) => ({
    ...state,
    error: null,
  })),
);
`;
}

function renderEffects() {
  return `import { Injectable, inject } from "@angular/core";
import { Router } from "@angular/router";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { catchError, exhaustMap, map, of, tap } from "rxjs";
import { getErrorMessage } from "../../shared/utils/get-error-message";
import { ToastService } from "../services/toast.service";
import { AuthService } from "./auth.service";
import { AuthTokenStore } from "./auth.token-store";
import { AuthActions } from "./auth.actions";

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly authService = inject(AuthService);
  private readonly tokenStore = inject(AuthTokenStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      exhaustMap(({ credentials }) =>
        this.authService.login(credentials).pipe(
          map((response) => AuthActions.loginSuccess({ response })),
          catchError((error: unknown) =>
            of(AuthActions.loginFailure({ error: getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );

  register$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.register),
      exhaustMap(({ input }) =>
        this.authService.register(input).pipe(
          map((response) => AuthActions.registerSuccess({ response })),
          catchError((error: unknown) =>
            of(AuthActions.registerFailure({ error: getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );

  loadCurrentUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loadCurrentUser),
      exhaustMap(() =>
        this.authService.me().pipe(
          map((user) => AuthActions.loadCurrentUserSuccess({ user })),
          catchError((error: unknown) =>
            of(
              AuthActions.loadCurrentUserFailure({
                error: getErrorMessage(error),
              }),
            ),
          ),
        ),
      ),
    ),
  );

  syncToken$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          AuthActions.loginSuccess,
          AuthActions.registerSuccess,
          AuthActions.refreshSuccess,
        ),
        tap(({ response }) => this.tokenStore.set(response.accessToken)),
      ),
    { dispatch: false },
  );

  clearToken$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.sessionExpired),
        tap(() => this.tokenStore.clear()),
      ),
    { dispatch: false },
  );

  redirectAfterAuth$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.loginSuccess, AuthActions.registerSuccess),
        tap(() => {
          void this.router.navigateByUrl("/dashboard");
        }),
      ),
    { dispatch: false },
  );

  logout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logout),
        tap(() => this.tokenStore.clear()),
        exhaustMap(() =>
          this.authService.logout().pipe(
            catchError(() => of(null)),
            tap(() => {
              void this.router.navigateByUrl("/login");
            }),
          ),
        ),
      ),
    { dispatch: false },
  );

  notifyFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.loginFailure, AuthActions.registerFailure),
        tap(({ error }) => this.toast.error(error)),
      ),
    { dispatch: false },
  );
}
`;
}

function renderSelectors() {
  return `import { createFeatureSelector, createSelector } from "@ngrx/store";
import { authFeatureKey, type AuthState } from "./auth.state";

export const selectAuthState =
  createFeatureSelector<AuthState>(authFeatureKey);

export const selectAuthUser = createSelector(
  selectAuthState,
  (state) => state.user,
);
export const selectAccessToken = createSelector(
  selectAuthState,
  (state) => state.accessToken,
);
export const selectIsAuthenticated = createSelector(
  selectAuthState,
  (state) => state.isAuthenticated,
);
export const selectIsInitialized = createSelector(
  selectAuthState,
  (state) => state.isInitialized,
);
export const selectAuthStatus = createSelector(
  selectAuthState,
  (state) => state.status,
);
export const selectAuthError = createSelector(
  selectAuthState,
  (state) => state.error,
);
export const selectRoles = createSelector(
  selectAuthUser,
  (user) => user?.roles ?? [],
);
export const selectPermissions = createSelector(
  selectAuthUser,
  (user) => user?.permissions ?? [],
);
`;
}

function renderRefreshCoordinator() {
  return `import { Injectable, inject } from "@angular/core";
import { Store } from "@ngrx/store";
import { Observable, catchError, finalize, map, of, shareReplay } from "rxjs";
import { RefreshClient } from "./refresh-client";
import { AuthActions } from "./auth.actions";

/**
 * Single-flight refresh. Concurrent 401s all subscribe to the same in-flight
 * refresh; the shared result is replayed to every caller and the slot is reset
 * once it settles. On success it emits the new access token and dispatches
 * \`refreshSuccess\`; on failure it emits \`null\` and dispatches \`sessionExpired\`.
 */
@Injectable({ providedIn: "root" })
export class AuthRefreshCoordinator {
  private readonly refreshClient = inject(RefreshClient);
  private readonly store = inject(Store);

  private inFlight: Observable<string | null> | null = null;

  refresh(): Observable<string | null> {
    if (!this.inFlight) {
      this.inFlight = this.refreshClient.refresh().pipe(
        map((response) => {
          this.store.dispatch(AuthActions.refreshSuccess({ response }));
          return response.accessToken;
        }),
        catchError(() => {
          this.store.dispatch(AuthActions.sessionExpired());
          return of<string | null>(null);
        }),
        finalize(() => {
          this.inFlight = null;
        }),
        shareReplay(1),
      );
    }

    return this.inFlight;
  }
}
`;
}

function renderInterceptor() {
  return `import { HttpErrorResponse, type HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, switchMap, throwError } from "rxjs";
import { AuthTokenStore } from "./auth.token-store";
import { AuthRefreshCoordinator } from "./auth.refresh-coordinator";

const RETRY_HEADER = "X-Auth-Retry";

/**
 * Attaches the in-memory Bearer token and, on a 401, runs a single-flight
 * refresh (via \`AuthRefreshCoordinator\`) before retrying the original request
 * exactly once. Register this AFTER \`apiInterceptor\` so the request already
 * carries the absolute URL and \`withCredentials\`.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStore = inject(AuthTokenStore);
  const coordinator = inject(AuthRefreshCoordinator);

  const token = tokenStore.token();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: \`Bearer \${token}\` } })
    : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.headers.has(RETRY_HEADER)
      ) {
        return coordinator.refresh().pipe(
          switchMap((newToken) => {
            if (!newToken) {
              return throwError(() => error);
            }
            const retried = req.clone({
              setHeaders: {
                Authorization: \`Bearer \${newToken}\`,
                [RETRY_HEADER]: "true",
              },
            });
            return next(retried);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
`;
}

function renderAuthGuard() {
  return `import { inject } from "@angular/core";
import { type CanActivateFn, Router } from "@angular/router";
import { Store } from "@ngrx/store";
import { selectIsAuthenticated } from "./auth.selectors";

export const authGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);

  if (store.selectSignal(selectIsAuthenticated)()) {
    return true;
  }

  return router.parseUrl("/login");
};
`;
}

function renderPermissionGuard() {
  return `import { inject } from "@angular/core";
import { type CanActivateFn, Router } from "@angular/router";
import { Store } from "@ngrx/store";
import { selectPermissions } from "./auth.selectors";

/**
 * Route guard factory: allows activation only when the current user holds the
 * given permission, otherwise redirects to the dashboard.
 *
 * @example
 * { path: "admin", canActivate: [permissionGuard("users.manage")], ... }
 */
export function permissionGuard(permission: string): CanActivateFn {
  return () => {
    const store = inject(Store);
    const router = inject(Router);

    if (store.selectSignal(selectPermissions)().includes(permission)) {
      return true;
    }

    return router.parseUrl("/dashboard");
  };
}
`;
}

function renderProviders() {
  return `import {
  type EnvironmentProviders,
  inject,
  provideAppInitializer,
} from "@angular/core";
import { provideEffects } from "@ngrx/effects";
import { Store, provideState } from "@ngrx/store";
import { catchError, finalize, firstValueFrom, of } from "rxjs";
import { AuthActions } from "./auth.actions";
import { AuthEffects } from "./auth.effects";
import { AuthRefreshCoordinator } from "./auth.refresh-coordinator";
import { authReducer } from "./auth.reducer";
import { authFeatureKey } from "./auth.state";

/**
 * Registers the auth NgRx feature + effects and performs a single silent
 * refresh at startup. Spread into the root \`ApplicationConfig.providers\`.
 */
export function provideAuth(): EnvironmentProviders[] {
  return [
    provideState(authFeatureKey, authReducer),
    provideEffects(AuthEffects),
    provideAppInitializer(() => {
      const coordinator = inject(AuthRefreshCoordinator);
      const store = inject(Store);
      return firstValueFrom(
        coordinator.refresh().pipe(
          catchError(() => of(null)),
          finalize(() => store.dispatch(AuthActions.setInitialized())),
        ),
      );
    }),
  ];
}
`;
}

function renderLoginPage() {
  return `import { Component, computed, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Store } from "@ngrx/store";
import { AuthActions } from "../../core/auth/auth.actions";
import {
  selectAuthError,
  selectAuthStatus,
} from "../../core/auth/auth.selectors";

@Component({
  selector: "app-login-page",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: \`
    <main
      class="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16"
    >
      <header>
        <h1 class="text-3xl font-semibold text-zinc-900">Sign in</h1>
        <p class="mt-1 text-sm text-zinc-600">
          Welcome back. Enter your credentials to continue.
        </p>
      </header>

      @if (error(); as message) {
        <p class="text-sm text-red-600" role="alert">{{ message }}</p>
      }

      <form class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()">
        <label class="flex flex-col gap-1 text-sm text-zinc-800">
          Email
          <input
            type="email"
            autocomplete="email"
            class="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
            formControlName="email"
          />
        </label>

        <label class="flex flex-col gap-1 text-sm text-zinc-800">
          Password
          <input
            type="password"
            autocomplete="current-password"
            class="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
            formControlName="password"
          />
        </label>

        <button
          type="submit"
          class="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60"
          [disabled]="submitting()"
        >
          {{ submitting() ? "Signing in..." : "Sign in" }}
        </button>

        <p class="text-sm text-zinc-600">
          Need an account?
          <a routerLink="/register" class="text-zinc-900 underline">Create one</a>
        </p>
      </form>
    </main>
  \`,
})
export class LoginPageComponent {
  private readonly store = inject(Store);
  private readonly fb = inject(FormBuilder);
  private readonly status = this.store.selectSignal(selectAuthStatus);

  readonly error = this.store.selectSignal(selectAuthError);
  readonly submitting = computed(() => this.status() === "loading");

  readonly form = this.fb.nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.store.dispatch(
      AuthActions.login({ credentials: this.form.getRawValue() }),
    );
  }
}
`;
}

function renderRegisterPage() {
  return `import { Component, computed, inject } from "@angular/core";
import {
  type AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Store } from "@ngrx/store";
import { AuthActions } from "../../core/auth/auth.actions";
import {
  selectAuthError,
  selectAuthStatus,
} from "../../core/auth/auth.selectors";

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get("password")?.value;
  const confirmPassword = group.get("confirmPassword")?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: "app-register-page",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: \`
    <main
      class="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16"
    >
      <header>
        <h1 class="text-3xl font-semibold text-zinc-900">Create account</h1>
        <p class="mt-1 text-sm text-zinc-600">
          Set up your account to get started.
        </p>
      </header>

      @if (error(); as message) {
        <p class="text-sm text-red-600" role="alert">{{ message }}</p>
      }

      <form class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()">
        <label class="flex flex-col gap-1 text-sm text-zinc-800">
          Name
          <input
            type="text"
            autocomplete="name"
            class="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
            formControlName="displayName"
          />
        </label>

        <label class="flex flex-col gap-1 text-sm text-zinc-800">
          Email
          <input
            type="email"
            autocomplete="email"
            class="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
            formControlName="email"
          />
        </label>

        <label class="flex flex-col gap-1 text-sm text-zinc-800">
          Password
          <input
            type="password"
            autocomplete="new-password"
            class="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
            formControlName="password"
          />
        </label>

        <label class="flex flex-col gap-1 text-sm text-zinc-800">
          Confirm password
          <input
            type="password"
            autocomplete="new-password"
            class="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
            formControlName="confirmPassword"
          />
        </label>

        @if (
          form.hasError("passwordMismatch") &&
          form.get("confirmPassword")?.touched
        ) {
          <p class="text-sm text-red-600" role="alert">
            Passwords do not match.
          </p>
        }

        <button
          type="submit"
          class="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60"
          [disabled]="submitting()"
        >
          {{ submitting() ? "Creating account..." : "Create account" }}
        </button>

        <p class="text-sm text-zinc-600">
          Already have an account?
          <a routerLink="/login" class="text-zinc-900 underline">Sign in</a>
        </p>
      </form>
    </main>
  \`,
})
export class RegisterPageComponent {
  private readonly store = inject(Store);
  private readonly fb = inject(FormBuilder);
  private readonly status = this.store.selectSignal(selectAuthStatus);

  readonly error = this.store.selectSignal(selectAuthError);
  readonly submitting = computed(() => this.status() === "loading");

  readonly form = this.fb.nonNullable.group(
    {
      displayName: ["", [Validators.required, Validators.maxLength(120)]],
      email: ["", [Validators.required, Validators.email]],
      password: ["", [Validators.required, Validators.minLength(8)]],
      confirmPassword: ["", [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { displayName, email, password } = this.form.getRawValue();
    this.store.dispatch(
      AuthActions.register({ input: { displayName, email, password } }),
    );
  }
}
`;
}

// ===========================================================================
// Shared helpers
// ===========================================================================

/**
 * @param {string} content
 * @param {string} importLine
 */
function ensureImport(content, importLine) {
  if (content.includes(importLine)) {
    return content;
  }

  // Insert BEFORE the first import so we never split a multi-line import
  // statement (e.g. `import {\n  a,\n  b,\n} from "...";`).
  const lines = content.split('\n');
  let firstImport = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (/^import\s/.test(lines[index])) {
      firstImport = index;
      break;
    }
  }

  if (firstImport === -1) {
    return `${importLine}\n${content}`;
  }

  lines.splice(firstImport, 0, importLine);
  return lines.join('\n');
}
