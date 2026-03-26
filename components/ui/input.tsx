import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <input
        className={cn(
          "flex h-11 w-full rounded-xl border border-[#dfd0b0] bg-[#fffdf8] px-3 py-2 text-sm text-[#4d556f] outline-none transition placeholder:text-[#a79876] focus:border-[#d4b36c] focus:ring-2 focus:ring-[#efdba7]/70",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
