import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const buttonVariants = cva(
  // Base styles: border, transition, press physics, disabled state
  "inline-flex items-center justify-center font-black uppercase tracking-widest border-3 border-ink transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none focus:outline-none cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-primary-container text-ink shadow-[4px_4px_0px_#1A1A1A] hover:shadow-[2px_2px_0px_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]",
        secondary:
          "bg-secondary text-white shadow-[4px_4px_0px_#1A1A1A] hover:shadow-[2px_2px_0px_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]",
        outline:
          "bg-white text-ink shadow-[4px_4px_0px_#1A1A1A] hover:shadow-[2px_2px_0px_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]",
        ghost:
          "border-transparent shadow-none hover:bg-ink/5 active:translate-x-0 active:translate-y-0",
        danger:
          "bg-error text-white shadow-[4px_4px_0px_#1A1A1A] hover:shadow-[2px_2px_0px_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]",
        tertiary:
          "bg-tertiary text-white shadow-[4px_4px_0px_#1A1A1A] hover:shadow-[2px_2px_0px_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px]",
        ink:
          "bg-ink text-white shadow-[4px_4px_0px_#A8275A] hover:shadow-[2px_2px_0px_#A8275A] hover:translate-x-[2px] hover:translate-y-[2px]",
      },
      size: {
        xs: "px-3 py-1 text-[10px] border-2",
        sm: "px-4 py-2 text-xs",
        default: "px-6 py-3 text-sm",
        lg: "px-10 py-5 text-lg",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// eslint-disable-next-line react-refresh/only-export-components
export { buttonVariants };
