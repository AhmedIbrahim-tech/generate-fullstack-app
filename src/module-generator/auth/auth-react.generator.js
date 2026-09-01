import path from 'node:path';
import { paths } from '../modules-orchestrator-helpers.js';

/**
 * V4 Authentication — React module generator.
 *
 * Security model:
 *  - The access token lives in RUNTIME MEMORY ONLY (Redux state). It is never
 *    written to localStorage/sessionStorage.
 *  - The refresh token is delivered as an HttpOnly cookie and travels via
 *    `withCredentials`. JavaScript never reads it.
 *  - A dedicated `refreshClient` (no 401 interceptor) performs the refresh call
 *    so the 401-refresh interceptor can never recurse into itself.
 *  - When several requests fail with 401 at once, a single-flight refresh is
 *    shared between them and each original request is retried once.
 *
 * @param {{ frontendStrategy?: { library?: string, framework?: string }, projectName?: string }} config
 * @returns {{
 *   files: { relativePath: string, contents: string, writeMode?: string }[],
 *   registryUpdates: { relativePath: string, update: (existing: string) => string }[],
 * }}
 */
export function planAuthReactModule(config) {
  const framework =
    config?.frontendStrategy?.framework === 'vite' ? 'vite' : 'next';
  const ctx = { framework };

  const moduleBase = paths.reactModule('auth');
  const libApiBase = paths.client('lib', 'api');

  /** @type {{ relativePath: string, contents: string, writeMode?: string }[]} */
  const files = [];

  // --- types + schema -------------------------------------------------------
  files.push({
    relativePath: path.join(moduleBase, 'types', 'auth.types.ts'),
    contents: renderTypes(),
  });
  files.push({
    relativePath: path.join(moduleBase, 'schemas', 'auth.schema.ts'),
    contents: renderSchema(),
  });

  // --- services -------------------------------------------------------------
  files.push({
    relativePath: path.join(moduleBase, 'services', 'auth.routes.ts'),
    contents: renderRoutes(),
  });
  files.push({
    relativePath: path.join(moduleBase, 'services', 'refresh-client.ts'),
    contents: renderRefreshClient(),
  });
  files.push({
    relativePath: path.join(moduleBase, 'services', 'auth.service.ts'),
    contents: renderService(),
  });

  // --- slice + thunks -------------------------------------------------------
  files.push({
    relativePath: path.join(moduleBase, 'slices', 'thunks', 'login.thunk.ts'),
    contents: renderLoginThunk(),
  });
  files.push({
    relativePath: path.join(moduleBase, 'slices', 'thunks', 'register.thunk.ts'),
    contents: renderRegisterThunk(),
  });
  files.push({
    relativePath: path.join(moduleBase, 'slices', 'thunks', 'refresh.thunk.ts'),
    contents: renderRefreshThunk(),
  });
  files.push({
    relativePath: path.join(moduleBase, 'slices', 'thunks', 'logout.thunk.ts'),
    contents: renderLogoutThunk(),
  });
  files.push({
    relativePath: path.join(moduleBase, 'slices', 'thunks', 'me.thunk.ts'),
    contents: renderMeThunk(),
  });
  files.push({
    relativePath: path.join(moduleBase, 'slices', 'auth.slice.ts'),
    contents: renderSlice(),
  });

  // --- hooks ----------------------------------------------------------------
  files.push({
    relativePath: path.join(moduleBase, 'hooks', 'useAuth.ts'),
    contents: renderUseAuth(),
  });
  files.push({
    relativePath: path.join(moduleBase, 'hooks', 'useAuthController.ts'),
    contents: renderUseAuthController(),
  });

  // --- components -----------------------------------------------------------
  files.push({
    relativePath: path.join(moduleBase, 'components', 'AuthInitializer.tsx'),
    contents: renderAuthInitializer(),
  });
  files.push({
    relativePath: path.join(moduleBase, 'components', 'AuthGate.tsx'),
    contents: renderAuthGate(ctx),
  });
  files.push({
    relativePath: path.join(moduleBase, 'components', 'PermissionGate.tsx'),
    contents: renderPermissionGate(),
  });
  files.push({
    relativePath: path.join(moduleBase, 'components', 'Can.tsx'),
    contents: renderCan(),
  });
  files.push({
    relativePath: path.join(moduleBase, 'components', 'LoginForm.tsx'),
    contents: renderLoginForm(ctx),
  });
  files.push({
    relativePath: path.join(moduleBase, 'components', 'RegisterForm.tsx'),
    contents: renderRegisterForm(ctx),
  });

  // --- module pages ---------------------------------------------------------
  files.push({
    relativePath: path.join(moduleBase, 'pages', 'LoginPage.tsx'),
    contents: renderLoginPage(ctx),
  });
  files.push({
    relativePath: path.join(moduleBase, 'pages', 'RegisterPage.tsx'),
    contents: renderRegisterPage(ctx),
  });

  // --- barrel ---------------------------------------------------------------
  files.push({
    relativePath: path.join(moduleBase, 'index.ts'),
    contents: renderIndex(),
  });

  // --- api-client interceptor installer ------------------------------------
  files.push({
    relativePath: path.join(libApiBase, 'api-client.auth.ts'),
    contents: renderApiClientAuth(),
  });

  // --- framework wiring -----------------------------------------------------
  if (framework === 'next') {
    files.push(...planNextWiring());
  } else {
    files.push(...planViteWiring());
  }

  // --- registry updates -----------------------------------------------------
  /** @type {{ relativePath: string, update: (existing: string) => string }[]} */
  const registryUpdates = [
    {
      relativePath: paths.client('store', 'generated-reducers.ts'),
      update: (existing) => buildAuthReducerRegistry(existing),
    },
  ];

  return { files, registryUpdates };
}

/**
 * Idempotently register the auth reducer inside
 * `Frontend/src/store/generated-reducers.ts`.
 * @param {string} [existingContents]
 * @returns {string}
 */
export function buildAuthReducerRegistry(existingContents) {
  const importLine = 'import authReducer from "@/modules/auth/slices/auth.slice";';
  const entryLine = '  auth: authReducer,';

  let content =
    existingContents && existingContents.trim().length > 0
      ? existingContents
      : `// AUTO-GENERATED BY create-fullstack-feature
// DO NOT EDIT MANUALLY

export const generatedReducers = {};
`;

  if (content.includes(entryLine)) {
    return content;
  }

  content = ensureImport(content, importLine);
  content = ensureObjectEntry(content, 'generatedReducers', entryLine);
  return content;
}

// ===========================================================================
// Framework wiring
// ===========================================================================

/**
 * @returns {{ relativePath: string, contents: string, writeMode?: string }[]}
 */
function planNextWiring() {
  const appBase = paths.client('app');

  return [
    {
      relativePath: path.join(appBase, 'providers.tsx'),
      contents: `"use client";

import { Toaster } from "sonner";
import type { ReactNode } from "react";
import { StoreProvider } from "@/store/provider";
import { AuthInitializer } from "@/modules/auth/components/AuthInitializer";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <AuthInitializer>{children}</AuthInitializer>
      <Toaster richColors closeButton position="top-right" />
    </StoreProvider>
  );
}
`,
      writeMode: 'replace',
    },
    {
      relativePath: path.join(appBase, '(auth)', 'login', 'page.tsx'),
      contents: `export { default } from "@/modules/auth/pages/LoginPage";
`,
      writeMode: 'replace',
    },
    {
      relativePath: path.join(appBase, '(auth)', 'register', 'page.tsx'),
      contents: `export { default } from "@/modules/auth/pages/RegisterPage";
`,
      writeMode: 'replace',
    },
    {
      relativePath: path.join(appBase, '(dashboard)', 'layout.tsx'),
      contents: `import Link from "next/link";
import { generatedDashboardNav } from "@/navigation/generated-dashboard-nav";
import { AuthGate } from "@/modules/auth/components/AuthGate";

export default function DashboardGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGate>
      <div className="min-h-screen">
        <header className="border-b border-zinc-200 px-6 py-4">
          <nav className="mx-auto flex max-w-5xl flex-wrap gap-4 text-sm">
            <Link className="underline" href="/dashboard">
              Dashboard
            </Link>
            {generatedDashboardNav.map((item) => (
              <Link key={item.href} className="underline" href={item.href}>
                {item.label}
              </Link>
            ))}
            <Link className="underline" href="/">
              Website
            </Link>
          </nav>
        </header>
        {children}
      </div>
    </AuthGate>
  );
}
`,
      writeMode: 'replace',
    },
  ];
}

/**
 * @returns {{ relativePath: string, contents: string, writeMode?: string }[]}
 */
function planViteWiring() {
  const appBase = paths.client('app');

  return [
    {
      relativePath: path.join(appBase, 'providers.tsx'),
      contents: `import { Toaster } from "sonner";
import type { ReactNode } from "react";
import { StoreProvider } from "@/store/provider";
import { AuthInitializer } from "@/modules/auth/components/AuthInitializer";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <AuthInitializer>{children}</AuthInitializer>
      <Toaster richColors closeButton position="top-right" />
    </StoreProvider>
  );
}
`,
      writeMode: 'replace',
    },
    {
      relativePath: path.join(appBase, 'pages', 'LoginPage.tsx'),
      contents: `export { default as LoginPage } from "@/modules/auth/pages/LoginPage";
`,
      writeMode: 'replace',
    },
    {
      relativePath: path.join(appBase, 'pages', 'RegisterPage.tsx'),
      contents: `export { default as RegisterPage } from "@/modules/auth/pages/RegisterPage";
`,
      writeMode: 'replace',
    },
    {
      relativePath: path.join(appBase, 'layouts', 'DashboardLayout.tsx'),
      contents: `import { Link, Outlet } from "react-router-dom";
import { generatedDashboardNav } from "@/navigation/generated-dashboard-nav";
import { AuthGate } from "@/modules/auth/components/AuthGate";

export function DashboardLayout() {
  return (
    <AuthGate>
      <div className="min-h-screen">
        <header className="border-b border-zinc-200 px-6 py-4">
          <nav className="mx-auto flex max-w-5xl flex-wrap gap-4 text-sm">
            <Link className="underline" to="/dashboard">
              Dashboard
            </Link>
            {generatedDashboardNav.map((item) => (
              <Link key={item.href} className="underline" to={item.href}>
                {item.label}
              </Link>
            ))}
            <Link className="underline" to="/">
              Website
            </Link>
          </nav>
        </header>
        <Outlet />
      </div>
    </AuthGate>
  );
}
`,
      writeMode: 'replace',
    },
  ];
}

// ===========================================================================
// File renderers
// ===========================================================================

function renderTypes() {
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

export type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
};
`;
}

function renderSchema() {
  return `import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    displayName: z.string().min(1, "Name is required").max(120),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
`;
}

function renderRoutes() {
  return `export const authApiRoutes = {
  login: "/api/v1/Auth/Login",
  register: "/api/v1/Auth/Register",
  refresh: "/api/v1/Auth/Refresh",
  logout: "/api/v1/Auth/Logout",
  me: "/api/v1/Auth/Me",
} as const;

export const authAppRoutes = {
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
} as const;
`;
}

function renderRefreshClient() {
  return `import axios from "axios";
import { publicEnv } from "@/lib/config/env";

/**
 * A dedicated Axios instance used exclusively for the refresh call.
 *
 * It intentionally has NO 401-refresh interceptor: the main \`apiClient\` retries
 * failed requests by calling refresh, so refreshing through the same client
 * would recurse endlessly. \`withCredentials\` sends the HttpOnly refresh cookie.
 */
export const refreshClient = axios.create({
  baseURL: publicEnv.apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});
`;
}

function renderService() {
  return `import { apiClient } from "@/lib/api/api-client";
import { refreshClient } from "./refresh-client";
import { authApiRoutes } from "./auth.routes";
import type {
  AuthResponse,
  AuthUser,
  LoginRequest,
  RegisterRequest,
} from "../types/auth.types";

export const authService = {
  async login(input: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      authApiRoutes.login,
      input,
    );
    return response.data;
  },

  async register(input: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      authApiRoutes.register,
      input,
    );
    return response.data;
  },

  /**
   * Uses \`refreshClient\` (no 401 interceptor) so the refresh call can never
   * trigger another refresh. The HttpOnly cookie authenticates the request.
   */
  async refresh(): Promise<AuthResponse> {
    const response = await refreshClient.post<AuthResponse>(
      authApiRoutes.refresh,
    );
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post(authApiRoutes.logout);
  },

  async me(): Promise<AuthUser> {
    const response = await apiClient.get<AuthUser>(authApiRoutes.me);
    return response.data;
  },
};
`;
}

function renderLoginThunk() {
  return `import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { authService } from "../../services/auth.service";
import type { AuthResponse, LoginRequest } from "../../types/auth.types";

export const login = createAsyncThunk<
  AuthResponse,
  LoginRequest,
  { rejectValue: string }
>("auth/login", async (input, { rejectWithValue }) => {
  try {
    return await authService.login(input);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
`;
}

function renderRegisterThunk() {
  return `import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { authService } from "../../services/auth.service";
import type { AuthResponse, RegisterRequest } from "../../types/auth.types";

export const register = createAsyncThunk<
  AuthResponse,
  RegisterRequest,
  { rejectValue: string }
>("auth/register", async (input, { rejectWithValue }) => {
  try {
    return await authService.register(input);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
`;
}

function renderRefreshThunk() {
  return `import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { authService } from "../../services/auth.service";
import type { AuthResponse } from "../../types/auth.types";

/**
 * Silent refresh. Rejection is expected for anonymous visitors and is handled
 * quietly by the slice (no toast) — it just marks the session initialized.
 */
export const refresh = createAsyncThunk<
  AuthResponse,
  void,
  { rejectValue: string }
>("auth/refresh", async (_, { rejectWithValue }) => {
  try {
    return await authService.refresh();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
`;
}

function renderLogoutThunk() {
  return `import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { authService } from "../../services/auth.service";

export const logout = createAsyncThunk<void, void, { rejectValue: string }>(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);
`;
}

function renderMeThunk() {
  return `import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { authService } from "../../services/auth.service";
import type { AuthUser } from "../../types/auth.types";

export const loadCurrentUser = createAsyncThunk<
  AuthUser,
  void,
  { rejectValue: string }
>("auth/me", async (_, { rejectWithValue }) => {
  try {
    return await authService.me();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
`;
}

function renderSlice() {
  return `import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthState } from "../types/auth.types";
import { login } from "./thunks/login.thunk";
import { register } from "./thunks/register.thunk";
import { refresh } from "./thunks/refresh.thunk";
import { logout } from "./thunks/logout.thunk";
import { loadCurrentUser } from "./thunks/me.thunk";

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /** Keeps the in-memory access token in sync with the interceptor. */
    setAccessToken(state, action: PayloadAction<string | null>) {
      state.accessToken = action.payload;
      state.isAuthenticated = action.payload != null && state.user != null;
    },
    /** Cleared session after an unrecoverable 401 / failed refresh. */
    sessionExpired(state) {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
    },
    setInitialized(state) {
      state.isInitialized = true;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.isInitialized = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Unable to sign in";
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.isInitialized = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Unable to create account";
      })
      .addCase(refresh.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(refresh.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.isInitialized = true;
      })
      .addCase(refresh.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.isInitialized = true;
      })
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.isInitialized = true;
      })
      .addCase(logout.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.isInitialized = true;
      })
      .addCase(loadCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = state.accessToken != null;
      });
  },
});

export const { setAccessToken, sessionExpired, setInitialized, clearAuthError } =
  authSlice.actions;
export default authSlice.reducer;
`;
}

function renderUseAuth() {
  return `"use client";

import { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";

/**
 * Read-only view of the auth slice with derived role/permission helpers.
 */
export function useAuth() {
  const auth = useAppSelector((state) => state.auth);

  return useMemo(() => {
    const roles = auth.user?.roles ?? [];
    const permissions = auth.user?.permissions ?? [];

    return {
      user: auth.user,
      accessToken: auth.accessToken,
      isAuthenticated: auth.isAuthenticated,
      isInitialized: auth.isInitialized,
      isLoading: auth.isLoading,
      error: auth.error,
      roles,
      permissions,
      hasRole: (role: string) => roles.includes(role),
      hasPermission: (permission: string) => permissions.includes(permission),
    };
  }, [auth]);
}
`;
}

function renderUseAuthController() {
  return `"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { notify } from "@/shared/utils/toast";
import { login } from "../slices/thunks/login.thunk";
import { register } from "../slices/thunks/register.thunk";
import { logout } from "../slices/thunks/logout.thunk";
import { clearAuthError } from "../slices/auth.slice";
import type { LoginRequest, RegisterRequest } from "../types/auth.types";

/**
 * Imperative auth actions with user-facing toasts. Read state through
 * \`useAuth\` for rendering.
 */
export function useAuthController() {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const error = useAppSelector((state) => state.auth.error);

  const signIn = useCallback(
    async (input: LoginRequest) => {
      const result = await dispatch(login(input));
      if (login.fulfilled.match(result)) {
        notify.success("Signed in");
        return true;
      }
      notify.error(result.payload ?? "Unable to sign in");
      return false;
    },
    [dispatch],
  );

  const signUp = useCallback(
    async (input: RegisterRequest) => {
      const result = await dispatch(register(input));
      if (register.fulfilled.match(result)) {
        notify.success("Account created");
        return true;
      }
      notify.error(result.payload ?? "Unable to create account");
      return false;
    },
    [dispatch],
  );

  const signOut = useCallback(async () => {
    await dispatch(logout());
    notify.success("Signed out");
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  return { signIn, signUp, signOut, clearError, isLoading, error };
}
`;
}

function renderAuthInitializer() {
  return `"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useAppStore } from "@/store/hooks";
import { installAuthInterceptors } from "@/lib/api/api-client.auth";
import { useAuth } from "../hooks/useAuth";
import { refresh } from "../slices/thunks/refresh.thunk";
import { setAccessToken, sessionExpired } from "../slices/auth.slice";

/**
 * Installs the auth interceptors once and performs a single silent refresh on
 * mount. Anonymous visitors are handled quietly (no toast): the refresh simply
 * rejects and the slice marks the session initialized.
 */
export function AuthInitializer({ children }: { children?: ReactNode }) {
  const store = useAppStore();
  const { isInitialized } = useAuth();
  const startedRef = useRef(false);

  useEffect(() => {
    const eject = installAuthInterceptors({
      getAccessToken: () => store.getState().auth.accessToken,
      setAccessToken: (token) => store.dispatch(setAccessToken(token)),
      refresh: async () => {
        const result = await store.dispatch(refresh());
        if (refresh.fulfilled.match(result)) {
          return result.payload.accessToken;
        }
        return null;
      },
      onSessionExpired: () => store.dispatch(sessionExpired()),
    });

    return eject;
  }, [store]);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;
    void store.dispatch(refresh());
  }, [store]);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  return <>{children}</>;
}
`;
}

function renderAuthGate(ctx) {
  if (ctx.framework === 'next') {
    return `"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { authAppRoutes } from "../services/auth.routes";

/**
 * Guards its children behind an authenticated session. Unauthenticated users
 * are redirected to the login page once the session has initialized.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuth();

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace(authAppRoutes.login);
    }
  }, [isInitialized, isAuthenticated, router]);

  if (!isInitialized || !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
`;
  }

  return `import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { authAppRoutes } from "../services/auth.routes";

/**
 * Guards its children behind an authenticated session. Unauthenticated users
 * are redirected to the login page once the session has initialized.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitialized } = useAuth();

  if (!isInitialized) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to={authAppRoutes.login} replace />;
  }

  return <>{children}</>;
}
`;
}

function renderPermissionGate() {
  return `"use client";

import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";

type PermissionGateProps = {
  /** A single required permission. */
  permission?: string;
  /** Multiple required permissions, combined via \`mode\`. */
  permissions?: string[];
  /** "all" (default) requires every permission, "any" requires one. */
  mode?: "all" | "any";
  fallback?: ReactNode;
  children: ReactNode;
};

/**
 * Renders \`children\` only when the current user holds the required
 * permission(s); otherwise renders \`fallback\`.
 */
export function PermissionGate({
  permission,
  permissions,
  mode = "all",
  fallback = null,
  children,
}: PermissionGateProps) {
  const { permissions: granted } = useAuth();

  const required = permission ? [permission] : (permissions ?? []);
  const allowed =
    required.length === 0 ||
    (mode === "all"
      ? required.every((item) => granted.includes(item))
      : required.some((item) => granted.includes(item)));

  return <>{allowed ? children : fallback}</>;
}
`;
}

function renderCan() {
  return `"use client";

import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";

type CanProps = {
  permission?: string;
  role?: string;
  fallback?: ReactNode;
  children: ReactNode;
};

/**
 * Small convenience wrapper: renders \`children\` when the user satisfies the
 * given permission and/or role.
 */
export function Can({ permission, role, fallback = null, children }: CanProps) {
  const { permissions, roles } = useAuth();

  const allowed =
    (!permission || permissions.includes(permission)) &&
    (!role || roles.includes(role));

  return <>{allowed ? children : fallback}</>;
}
`;
}

function renderLoginForm(ctx) {
  const nav = reactRouterKit(ctx.framework);

  return `"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
${nav.formImports}
import { loginSchema, type LoginFormValues } from "../schemas/auth.schema";
import { useAuthController } from "../hooks/useAuthController";
import { authAppRoutes } from "../services/auth.routes";

export function LoginForm() {
  ${nav.routerSetup}
  const { signIn, isLoading } = useAuthController();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <form
      className="flex w-full max-w-sm flex-col gap-4"
      onSubmit={form.handleSubmit(async (values) => {
        const ok = await signIn(values);
        if (ok) {
          ${nav.go('authAppRoutes.dashboard')};
        }
      })}
      noValidate
    >
      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        Email
        <input
          type="email"
          autoComplete="email"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <span className="text-xs text-red-600">
            {form.formState.errors.email.message}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        Password
        <input
          type="password"
          autoComplete="current-password"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <span className="text-xs text-red-600">
            {form.formState.errors.password.message}
          </span>
        ) : null}
      </label>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {isLoading ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-sm text-zinc-600">
        Need an account?{" "}
        ${nav.linkOpen('authAppRoutes.register')} className="text-zinc-900 underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
`;
}

function renderRegisterForm(ctx) {
  const nav = reactRouterKit(ctx.framework);

  return `"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
${nav.formImports}
import { registerSchema, type RegisterFormValues } from "../schemas/auth.schema";
import { useAuthController } from "../hooks/useAuthController";
import { authAppRoutes } from "../services/auth.routes";

export function RegisterForm() {
  ${nav.routerSetup}
  const { signUp, isLoading } = useAuthController();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  return (
    <form
      className="flex w-full max-w-sm flex-col gap-4"
      onSubmit={form.handleSubmit(async (values) => {
        const ok = await signUp({
          email: values.email,
          displayName: values.displayName,
          password: values.password,
        });
        if (ok) {
          ${nav.go('authAppRoutes.dashboard')};
        }
      })}
      noValidate
    >
      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        Name
        <input
          type="text"
          autoComplete="name"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          {...form.register("displayName")}
        />
        {form.formState.errors.displayName ? (
          <span className="text-xs text-red-600">
            {form.formState.errors.displayName.message}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        Email
        <input
          type="email"
          autoComplete="email"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <span className="text-xs text-red-600">
            {form.formState.errors.email.message}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        Password
        <input
          type="password"
          autoComplete="new-password"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <span className="text-xs text-red-600">
            {form.formState.errors.password.message}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        Confirm password
        <input
          type="password"
          autoComplete="new-password"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          {...form.register("confirmPassword")}
        />
        {form.formState.errors.confirmPassword ? (
          <span className="text-xs text-red-600">
            {form.formState.errors.confirmPassword.message}
          </span>
        ) : null}
      </label>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {isLoading ? "Creating account..." : "Create account"}
      </button>

      <p className="text-sm text-zinc-600">
        Already have an account?{" "}
        ${nav.linkOpen('authAppRoutes.login')} className="text-zinc-900 underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
`;
}

function renderLoginPage() {
  return `"use client";

import { LoginForm } from "../components/LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16">
      <header>
        <h1 className="text-3xl font-semibold text-zinc-900">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Welcome back. Enter your credentials to continue.
        </p>
      </header>
      <LoginForm />
    </main>
  );
}
`;
}

function renderRegisterPage() {
  return `"use client";

import { RegisterForm } from "../components/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16">
      <header>
        <h1 className="text-3xl font-semibold text-zinc-900">Create account</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Set up your account to get started.
        </p>
      </header>
      <RegisterForm />
    </main>
  );
}
`;
}

function renderIndex() {
  return `export { default as authReducer } from "./slices/auth.slice";
export {
  setAccessToken,
  sessionExpired,
  setInitialized,
  clearAuthError,
} from "./slices/auth.slice";

export { default as LoginPage } from "./pages/LoginPage";
export { default as RegisterPage } from "./pages/RegisterPage";

export { LoginForm } from "./components/LoginForm";
export { RegisterForm } from "./components/RegisterForm";
export { AuthInitializer } from "./components/AuthInitializer";
export { AuthGate } from "./components/AuthGate";
export { PermissionGate } from "./components/PermissionGate";
export { Can } from "./components/Can";

export { useAuth } from "./hooks/useAuth";
export { useAuthController } from "./hooks/useAuthController";

export { authService } from "./services/auth.service";
export { authApiRoutes, authAppRoutes } from "./services/auth.routes";
export { refreshClient } from "./services/refresh-client";

export { login } from "./slices/thunks/login.thunk";
export { register } from "./slices/thunks/register.thunk";
export { refresh } from "./slices/thunks/refresh.thunk";
export { logout } from "./slices/thunks/logout.thunk";
export { loadCurrentUser } from "./slices/thunks/me.thunk";

export type {
  AuthUser,
  AuthState,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from "./types/auth.types";
`;
}

function renderApiClientAuth() {
  return `import type {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import { apiClient } from "./api-client";

export type InstallAuthInterceptorsOptions = {
  /** Reads the current in-memory access token (Redux). */
  getAccessToken: () => string | null;
  /** Persists a freshly refreshed access token back into memory (Redux). */
  setAccessToken: (token: string | null) => void;
  /** Performs the refresh (via the interceptor-free refresh client). */
  refresh: () => Promise<string | null>;
  /** Called when the session cannot be recovered after a 401. */
  onSessionExpired: () => void;
  /** Defaults to the shared \`apiClient\`. */
  client?: AxiosInstance;
};

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _authRetry?: boolean;
};

/**
 * Attaches the Bearer access token to every request and, on a 401, runs a
 * SINGLE-FLIGHT refresh shared by all concurrent failures before retrying each
 * original request exactly once.
 *
 * The refresh itself must go through a client WITHOUT this interceptor (see
 * \`refresh-client.ts\`) so refreshing can never recurse.
 *
 * @returns a cleanup function that removes the installed interceptors.
 */
export function installAuthInterceptors(
  options: InstallAuthInterceptorsOptions,
): () => void {
  const client = options.client ?? apiClient;
  let refreshPromise: Promise<string | null> | null = null;

  const runSingleFlightRefresh = (): Promise<string | null> => {
    if (!refreshPromise) {
      refreshPromise = options.refresh().finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
  };

  const requestId = client.interceptors.request.use((config) => {
    const token = options.getAccessToken();
    if (token) {
      config.headers.set("Authorization", \`Bearer \${token}\`);
    }
    return config;
  });

  const responseId = client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as RetryableRequestConfig | undefined;
      const status = error.response?.status;

      if (status !== 401 || !original || original._authRetry) {
        return Promise.reject(error);
      }

      original._authRetry = true;

      try {
        const token = await runSingleFlightRefresh();
        if (!token) {
          options.onSessionExpired();
          return Promise.reject(error);
        }

        options.setAccessToken(token);
        original.headers.set("Authorization", \`Bearer \${token}\`);
        return client(original);
      } catch (refreshError) {
        options.onSessionExpired();
        return Promise.reject(refreshError);
      }
    },
  );

  return () => {
    client.interceptors.request.eject(requestId);
    client.interceptors.response.eject(responseId);
  };
}
`;
}

// ===========================================================================
// Small framework/nav + registry helpers
// ===========================================================================

/**
 * @param {'vite' | 'next'} framework
 */
function reactRouterKit(framework) {
  if (framework === 'next') {
    return {
      formImports: 'import Link from "next/link";\nimport { useRouter } from "next/navigation";',
      routerSetup: 'const router = useRouter();',
      go: (expr) => `router.push(${expr})`,
      linkOpen: (expr) => `<Link href={${expr}}`,
    };
  }

  return {
    formImports: 'import { Link, useNavigate } from "react-router-dom";',
    routerSetup: 'const navigate = useNavigate();',
    go: (expr) => `navigate(${expr})`,
    linkOpen: (expr) => `<Link to={${expr}}`,
  };
}

/**
 * @param {string} content
 * @param {string} importLine
 */
function ensureImport(content, importLine) {
  if (content.includes(importLine)) {
    return content;
  }

  const lines = content.split('\n');
  let lastImport = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (/^import\s/.test(lines[index])) {
      lastImport = index;
    }
  }

  if (lastImport === -1) {
    const headerEnd = content.indexOf('\n\n');
    if (headerEnd !== -1) {
      return `${content.slice(0, headerEnd)}\n\n${importLine}${content.slice(headerEnd)}`;
    }
    return `${importLine}\n${content}`;
  }

  lines.splice(lastImport + 1, 0, importLine);
  return lines.join('\n');
}

/**
 * @param {string} content
 * @param {string} objectName
 * @param {string} entryLine
 */
function ensureObjectEntry(content, objectName, entryLine) {
  const emptyPattern = new RegExp(`export const ${objectName} = \\{\\};`);
  if (emptyPattern.test(content)) {
    return content.replace(
      emptyPattern,
      `export const ${objectName} = {\n${entryLine}\n};`,
    );
  }

  const filledPattern = new RegExp(
    `(export const ${objectName} = \\{)([\\s\\S]*?)(\\n\\};)`,
  );
  return content.replace(filledPattern, (match, open, inner, close) => {
    const body = inner.replace(/\s+$/, '');
    return `${open}${body}\n${entryLine}${close}`;
  });
}
