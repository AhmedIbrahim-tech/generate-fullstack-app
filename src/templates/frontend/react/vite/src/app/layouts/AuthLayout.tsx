import { Link, Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 px-6 py-4">
        <Link className="text-sm underline" to="/">
          Back to site
        </Link>
      </header>
      <Outlet />
    </div>
  );
}
