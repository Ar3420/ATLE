import Image from "next/image";
import type { ReactNode } from "react";

export function PageShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Image
              src="/alte-logo.png"
              alt="ALTE logo"
              width={22}
              height={22}
              className="h-5 w-5 object-contain"
            />
            <p className="text-xs uppercase tracking-[0.28em] text-[#c39534]">ALTE</p>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#3f4a61]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-sm leading-6 text-[#7d7567]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
