import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-base font-black tracking-wide ring-offset-background transition-brutal focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-brutal shadow-brutal hover:shadow-brutal-hover hover:translate-x-1 hover:translate-y-1 uppercase",
        brutal: "bg-accent text-accent-foreground border-brutal shadow-brutal hover:shadow-brutal-hover hover:translate-x-1 hover:translate-y-1 uppercase",
        hero: "bg-primary text-primary-foreground border-brutal shadow-brutal hover:shadow-brutal-hover hover:translate-x-1 hover:translate-y-1 hover:bg-accent uppercase",
        destructive: "bg-destructive text-destructive-foreground border-brutal shadow-brutal hover:shadow-brutal-hover hover:translate-x-1 hover:translate-y-1 uppercase",
        outline: "border-brutal bg-background hover:bg-accent hover:text-accent-foreground shadow-brutal hover:shadow-brutal-hover hover:translate-x-1 hover:translate-y-1 uppercase",
        secondary: "bg-secondary text-secondary-foreground border-brutal shadow-brutal hover:shadow-brutal-hover hover:translate-x-1 hover:translate-y-1 uppercase",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-14 px-8 py-4",
        sm: "h-12 px-6 py-3",
        lg: "h-16 px-12 py-5 text-lg",
        icon: "h-14 w-14",
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
