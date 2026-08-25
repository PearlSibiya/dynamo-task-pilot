import { Link } from "@tanstack/react-router";
import { Mail, NotebookPen, ListChecks, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Emails", icon: Mail, hint: "Draft & polish" },
  { to: "/meetings", label: "Meeting Notes", icon: NotebookPen, hint: "Summarize" },
  { to: "/tasks", label: "Tasks", icon: ListChecks, hint: "Plan & track" },
] as const;

export function AppShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:h-screen md:w-72 md:shrink-0">
        <div className="flex items-center gap-3 px-6 py-6">
          <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-9 items-center justify-center rounded-lg">
            <Sparkles className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-base font-semibold">Cadence</p>
            <p className="text-sidebar-foreground/60 text-xs">AI productivity assistant</p>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto px-4 pb-4 md:flex-col md:overflow-visible md:pb-0">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="hover:bg-sidebar-accent flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
              activeProps={{
                className: "bg-sidebar-accent text-sidebar-accent-foreground",
              }}
            >
              <item.icon className="size-4 shrink-0" />
              <span>{item.label}</span>
              <span className="text-sidebar-foreground/45 ml-auto hidden text-xs md:inline">
                {item.hint}
              </span>
            </Link>
          ))}
        </nav>

        <div className="border-sidebar-border text-sidebar-foreground/50 mt-auto hidden border-t px-6 py-5 text-xs md:block">
          No accounts, no setup. Everything runs on Lovable AI.
        </div>
      </aside>

      <main className="flex-1">
        <header className="paper-grid border-border border-b px-6 py-10 md:px-10">
          <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm md:text-base">
            {description}
          </p>
        </header>
        <div className="px-6 py-8 md:px-10">{children}</div>
      </main>
    </div>
  );
}
