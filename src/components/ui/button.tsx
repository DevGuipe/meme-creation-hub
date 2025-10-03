import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-popcat font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // FIXED: Use proper Tailwind border syntax and responsive shadows
        default: "bg-primary text-primary-foreground hover:bg-primary/90 border-[3px] border-primary rounded-2xl shadow-[3px_3px_0px_hsl(var(--primary))] md:shadow-[4px_4px_0px_hsl(var(--primary))] hover:shadow-[4px_4px_0px_hsl(var(--primary))] md:hover:shadow-[6px_6px_0px_hsl(var(--primary))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-300 ease-out",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-[3px] border-destructive rounded-2xl shadow-[3px_3px_0px_hsl(var(--destructive))] md:shadow-[4px_4px_0px_hsl(var(--destructive))] hover:shadow-[4px_4px_0px_hsl(var(--destructive))] md:hover:shadow-[6px_6px_0px_hsl(var(--destructive))] hover:translate-x-[-2px] hover:translate-y-[-2px]",
        outline: "border-[3px] border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground rounded-2xl shadow-[3px_3px_0px_hsl(var(--primary))] md:shadow-[4px_4px_0px_hsl(var(--primary))] hover:shadow-[4px_4px_0px_hsl(var(--primary))] md:hover:shadow-[6px_6px_0px_hsl(var(--primary))] hover:translate-x-[-2px] hover:translate-y-[-2px]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-[3px] border-secondary rounded-2xl shadow-[3px_3px_0px_hsl(var(--secondary))] md:shadow-[4px_4px_0px_hsl(var(--secondary))] hover:shadow-[4px_4px_0px_hsl(var(--secondary))] md:hover:shadow-[6px_6px_0px_hsl(var(--secondary))] hover:translate-x-[-2px] hover:translate-y-[-2px]",
        ghost: "hover:bg-accent hover:text-accent-foreground rounded-2xl",
        link: "text-primary underline-offset-4 hover:underline font-ui",
        popcat: "bg-gradient-to-r from-primary to-accent text-primary-foreground border-[3px] border-primary rounded-2xl shadow-[4px_4px_0px_hsl(var(--primary))] md:shadow-[6px_6px_0px_hsl(var(--primary))] hover:shadow-[6px_6px_0px_hsl(var(--primary))] md:hover:shadow-[8px_8px_0px_hsl(var(--primary))] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:scale-105 transition-all duration-300 ease-out",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 rounded-xl px-4",
        lg: "h-14 rounded-2xl px-10",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
