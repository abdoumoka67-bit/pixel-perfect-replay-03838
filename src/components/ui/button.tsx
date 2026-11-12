import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        // Neutral solid: softened charcoal, no glossy inner highlight.
        default:
          "bg-graphite text-white shadow-[0_1px_2px_rgba(16,24,40,0.1),0_2px_8px_-2px_rgba(16,24,40,0.14)] hover:bg-graphite-hover",
        // Primary action: brand green with a tinted elevation.
        brand:
          "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(0,128,96,0.18),0_3px_10px_-3px_rgba(0,128,96,0.4)] hover:bg-primary-hover",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-border/80 bg-background text-foreground hover:bg-[#F5F5F7] hover:text-foreground active:scale-[0.98] transition-all duration-150",
        secondary:
          "bg-[#F5F5F7] text-[#171717] border border-black/[0.06] hover:bg-[#EAEAEA] hover:border-black/10 active:scale-[0.98] shadow-sm transition-all duration-150",
        ghost: "hover:bg-secondary hover:text-secondary-foreground",
        link: "text-brand underline-offset-4 hover:underline",
        success: "bg-success text-primary-foreground hover:bg-success/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-lg font-semibold",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
