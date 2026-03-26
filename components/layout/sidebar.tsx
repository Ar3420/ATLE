"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
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

export function Sidebar({ email }: { email?: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-[#e4d7ba] bg-[#fffaf1]/90 backdrop-blur md:min-h-screen md:w-72 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between gap-4 p-6 md:block">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ecd69b] bg-[#fff3d2] px-3 py-1 text-xs uppercase tracking-[0.25em] text-[#b9892f]">
            <BookOpen className="h-3.5 w-3.5" />
            ALTE
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#55627e]">
              Adaptive Learning Engine
            </h1>
            <p className="mt-1 text-sm text-[#8d8067]">{email ?? "Signed in"}</p>
          </div>
        </div>
        <form action="/auth/signout" method="post" className="hidden md:block">
          <Button variant="secondary" size="sm">
            Sign out
          </Button>
        </form>
      </div>

      <nav className="grid grid-cols-2 gap-2 px-4 pb-4 md:grid-cols-1 md:px-6 md:pb-6">
        {appNavigation.map((item) => {
          const Icon = icons[item.href as keyof typeof icons] ?? NotebookPen;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition",
                isActive
                  ? "border-[#e4bd62] bg-[#fff1cb] text-[#9d7428]"
                  : "border-[#eee1c5] bg-[#fffdf8] text-[#847962] hover:border-[#e4d7ba] hover:bg-[#fbf1de] hover:text-[#5a4720]",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
