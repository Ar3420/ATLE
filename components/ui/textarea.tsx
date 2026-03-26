import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-xl border border-[#dfd0b0] bg-[#fffdf8] px-3 py-2 text-sm text-[#4d556f] outline-none transition placeholder:text-[#a79876] focus:border-[#d4b36c] focus:ring-2 focus:ring-[#efdba7]/70",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
