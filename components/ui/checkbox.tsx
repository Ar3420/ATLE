"use client";

import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={cn(
        "h-4 w-4 rounded border-[#cdb887] bg-[#fffdf8] text-[#d4b36c] focus:ring-[#e8cc8c]/60",
        className,
      )}
      {...props}
    />
  );
}
