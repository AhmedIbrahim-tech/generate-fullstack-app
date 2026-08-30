import Link from "next/link";
import { generatedDashboardNav } from "@/navigation/generated-dashboard-nav";

export default function DashboardGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
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
  );
}
