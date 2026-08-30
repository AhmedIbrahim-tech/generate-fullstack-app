import { Routes } from "@angular/router";
import { AuthLayoutComponent } from "./layouts/auth-layout/auth-layout.component";
import { DashboardLayoutComponent } from "./layouts/dashboard-layout/dashboard-layout.component";
import { WebsiteLayoutComponent } from "./layouts/website-layout/website-layout.component";
import { HomePageComponent } from "./features/home/home.page";
import { LoginPageComponent } from "./features/auth/login.page";
import { RegisterPageComponent } from "./features/auth/register.page";
import { DashboardPageComponent } from "./features/dashboard/dashboard.page";
import {
  generatedDashboardRoutes,
  generatedWebsiteRoutes,
} from "./router/generated-routes";

export const routes: Routes = [
  {
    path: "",
    component: WebsiteLayoutComponent,
    children: [{ path: "", component: HomePageComponent }, ...generatedWebsiteRoutes],
  },
  {
    path: "",
    component: AuthLayoutComponent,
    children: [
      { path: "login", component: LoginPageComponent },
      { path: "register", component: RegisterPageComponent },
    ],
  },
  {
    path: "dashboard",
    component: DashboardLayoutComponent,
    children: [
      { path: "", component: DashboardPageComponent },
      ...generatedDashboardRoutes,
    ],
  },
];
