import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border-2 px-3 py-1 text-xs font-popcat font-bold transition-all duration-300 hover:scale-105",
  {
    variants: {
      variant: {
        default: "border-primary bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md hover:shadow-lg",
        secondary: "border-secondary bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "border-primary text-primary bg-transparent hover:bg-primary/10",
        success: "border-green-500 bg-green-500 text-white hover:bg-green-600",
        purple: "border-purple-500 bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md hover:shadow-purple",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
