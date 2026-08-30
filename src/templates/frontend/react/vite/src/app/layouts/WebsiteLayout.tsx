import { Link, Outlet } from "react-router-dom";

export function WebsiteLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 px-6 py-4">
        <nav className="mx-auto flex max-w-5xl gap-4 text-sm">
          <Link className="underline" to="/">
            Home
          </Link>
          <Link className="underline" to="/examples">
            Examples
          </Link>
          <Link className="underline" to="/login">
            Auth
          </Link>
          <Link className="underline" to="/dashboard">
            Dashboard
          </Link>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
