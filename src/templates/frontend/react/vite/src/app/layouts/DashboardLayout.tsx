import { Link, Outlet } from "react-router-dom";
import { generatedDashboardNav } from "@/navigation/generated-dashboard-nav";

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between p-4">
        <div>
          <div className="mb-6 px-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h2>
          </div>
          <nav className="space-y-1">
            <Link
              to="/dashboard"
              className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Overview
            </Link>
            {generatedDashboardNav.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <Link
            to="/"
            className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            ← Back to Website
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Header & Breadcrumbs & User Menu */}
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-900">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm text-zinc-500">
            <Link to="/dashboard" className="hover:text-zinc-700 dark:hover:text-zinc-300">
              Home
            </Link>
            <span>/</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Dashboard</span>
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold">
                U
              </div>
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Admin User</span>
            </div>
            <Link
              to="/login"
              className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              Sign out
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
