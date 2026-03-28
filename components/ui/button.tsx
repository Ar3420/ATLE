import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center overflow-hidden rounded-xl border border-transparent text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4b36c] disabled:pointer-events-none disabled:opacity-50 after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:origin-left after:scale-x-0 after:bg-[#d4b36c] after:transition-transform after:duration-200 hover:after:scale-x-100 active:scale-[0.98] active:bg-[#d4b36c] active:text-white active:border-[#d4b36c]",
  {
    variants: {
      variant: {
        primary:
          "bg-white text-[#7f6225] shadow-[0_0_0_1px_rgba(176,139,63,0.16)] hover:text-[#5a4720] hover:shadow-[0_10px_24px_rgba(212,179,108,0.16)]",
        secondary: "border-[#dfd0b0] bg-white text-[#646d83] hover:text-[#5a4720]",
        ghost: "bg-transparent text-[#7a6f57] hover:text-[#5a4720]",
        danger: "border-red-500 bg-white text-red-600 hover:text-red-700 active:border-red-500 active:bg-red-500 active:text-white",
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
