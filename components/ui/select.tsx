import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type SelectOption = {
  label: string;
  value: string;
};

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  className,
  options,
  placeholder,
  ...props
}: SelectProps) {
  return (
    <select
      className={cn(
        "flex h-11 w-full rounded-xl border border-[#dfd0b0] bg-[#fffdf8] px-3 py-2 text-sm text-[#4d556f] outline-none transition focus:border-[#d4b36c] focus:ring-2 focus:ring-[#efdba7]/70",
        className,
      )}
      {...props}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
