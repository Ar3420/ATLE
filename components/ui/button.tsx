import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center overflow-hidden rounded-xl border border-transparent text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4b36c] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50 after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:origin-left after:scale-x-0 after:bg-[#d4b36c] after:transition-transform after:duration-200 hover:-translate-y-0.5 hover:after:scale-x-100 active:translate-y-0 active:scale-[0.985] active:bg-[#d4b36c] active:text-white active:border-[#d4b36c] active:shadow-[0_10px_22px_rgba(212,179,108,0.24)]",
  {
    variants: {
      variant: {
        primary:
          "bg-white text-[#7f6225] shadow-[0_0_0_1px_rgba(176,139,63,0.16)] hover:text-[#5a4720] hover:shadow-[0_14px_28px_rgba(212,179,108,0.18)]",
        secondary:
          "border-[#dfd0b0] bg-white text-[#646d83] hover:text-[#5a4720] hover:shadow-[0_10px_22px_rgba(212,179,108,0.10)]",
        ghost: "bg-transparent text-[#7a6f57] hover:bg-[#fff9ec] hover:text-[#5a4720]",
        danger:
          "border-red-500 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 active:border-red-500 active:bg-red-500 active:text-white",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-4",
        lg: "h-12 px-5",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      ref={ref}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
