import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[#eadab4] bg-[#fff7e6] px-2.5 py-1 text-xs font-medium text-[#977336]",
        className,
      )}
      {...props}
    />
  );
}
