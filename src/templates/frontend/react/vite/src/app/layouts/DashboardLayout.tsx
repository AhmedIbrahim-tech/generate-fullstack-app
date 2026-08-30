import { Link, Outlet } from "react-router-dom";
import { generatedDashboardNav } from "@/navigation/generated-dashboard-nav";

export function DashboardLayout() {
  return (
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
  );
}
