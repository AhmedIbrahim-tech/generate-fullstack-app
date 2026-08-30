import { createBrowserRouter } from "react-router-dom";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { DashboardLayout } from "@/app/layouts/DashboardLayout";
import { WebsiteLayout } from "@/app/layouts/WebsiteLayout";
import { LoginPage } from "@/app/pages/LoginPage";
import { RegisterPage } from "@/app/pages/RegisterPage";
import { DashboardPage } from "@/app/pages/DashboardPage";
import { HomePage } from "@/app/pages/HomePage";
import {
  generatedDashboardRoutes,
  generatedWebsiteRoutes,
} from "@/app/router/generated-routes";

export const appRouter = createBrowserRouter([
  {
    element: <WebsiteLayout />,
    children: [{ path: "/", element: <HomePage /> }, ...generatedWebsiteRoutes],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  {
    element: <DashboardLayout />,
    children: [
      { path: "/dashboard", element: <DashboardPage /> },
      ...generatedDashboardRoutes,
    ],
  },
]);
