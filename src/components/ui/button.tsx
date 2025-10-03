import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-popcat font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 border-[3px] border-primary rounded-2xl shadow-[4px_4px_0px_hsl(var(--primary-foreground)/0.2)] hover:shadow-[6px_6px_0px_hsl(var(--primary-foreground)/0.2)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0px_hsl(var(--primary-foreground)/0.2)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-[3px] border-destructive rounded-2xl shadow-[4px_4px_0px_hsl(var(--destructive-foreground)/0.2)] hover:shadow-[6px_6px_0px_hsl(var(--destructive-foreground)/0.2)] hover:translate-x-[-2px] hover:translate-y-[-2px]",
        outline: "border-[3px] border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground rounded-2xl shadow-[3px_3px_0px_hsl(var(--primary)/0.3)] hover:shadow-[5px_5px_0px_hsl(var(--primary)/0.3)] hover:translate-x-[-2px] hover:translate-y-[-2px]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-[3px] border-secondary rounded-2xl shadow-[3px_3px_0px_hsl(var(--secondary-foreground)/0.2)] hover:shadow-[5px_5px_0px_hsl(var(--secondary-foreground)/0.2)] hover:translate-x-[-2px] hover:translate-y-[-2px]",
        ghost: "hover:bg-accent/10 hover:text-accent-foreground rounded-2xl hover:scale-105",
        link: "text-primary underline-offset-4 hover:underline font-ui hover:text-primary/80",
        popcat: "bg-gradient-to-r from-primary via-accent to-primary text-primary-foreground border-[3px] border-primary/50 rounded-2xl shadow-[5px_5px_0px_hsl(var(--primary)/0.4)] hover:shadow-[7px_7px_0px_hsl(var(--primary)/0.4)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:scale-[1.02] bg-size-200 bg-pos-0 hover:bg-pos-100 animate-gradient-x",
        gradient: "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white border-0 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 hover:rotate-1",
        glass: "glass-effect border-2 border-white/40 text-foreground rounded-2xl hover:bg-white/95 hover:shadow-xl hover:scale-105",
        neon: "bg-accent text-accent-foreground border-[3px] border-accent rounded-2xl popcat-neon hover:scale-105 hover:border-accent/80",
      },
      size: {
        default: "h-12 px-6 py-3 text-sm",
        sm: "h-10 rounded-xl px-4 text-xs",
        lg: "h-14 rounded-2xl px-10 text-base",
        xl: "h-16 rounded-2xl px-12 text-lg",
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
