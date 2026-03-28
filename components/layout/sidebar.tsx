"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CircleHelp,
  FileUp,
  Gauge,
  LibraryBig,
  NotebookPen,
  ScrollText,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { appNavigation } from "@/lib/routes";

const icons = {
  "/dashboard": Gauge,
  "/subjects": LibraryBig,
  "/upload": FileUp,
  "/questions": CircleHelp,
  "/generate": Sparkles,
  "/tests": ScrollText,
  "/analytics": BarChart3,
} as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-[#e5dcc8] bg-white md:min-h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="border-b border-[#f0e8d8] px-6 py-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-2xl border border-[#e2cf9f] px-4 py-3 text-left transition hover:border-[#d4b36c] hover:bg-[#fffaf0]"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#b08426]">
            ALTE
          </p>
        </Link>
      </div>

      <nav className="grid grid-cols-2 gap-2 px-4 py-4 md:grid-cols-1 md:px-5">
        {appNavigation.map((item) => {
          const Icon = icons[item.href as keyof typeof icons] ?? NotebookPen;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 overflow-hidden rounded-xl border border-transparent bg-white px-4 py-3 text-sm font-medium text-[#5f677a] transition-[color,border-color,background-color,transform] duration-200 after:absolute after:bottom-0 after:left-4 after:right-4 after:h-[2px] after:origin-left after:scale-x-0 after:bg-[#d4b36c] after:transition-transform after:duration-200 hover:text-[#5a4720] hover:after:scale-x-100 active:scale-[0.98] active:bg-[#d4b36c] active:text-white",
                isActive
                  ? "border-[#e5dcc8] text-[#8c6f36] after:scale-x-100"
                  : "hover:border-[#efe5d1]",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-5 pb-5">
        <form action="/auth/signout" method="post">
          <Button variant="secondary" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
