import React from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Visual style variant */
  variant?: 'default' | 'underline' | 'dark';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const base = "font-bold uppercase placeholder:text-ink/20 focus:outline-none transition-all w-full";

    const variants = {
      default:
        "bg-white border-3 border-ink p-3 shadow-[2px_2px_0px_#1A1A1A] focus:shadow-[4px_4px_0px_#1A1A1A] focus:-translate-x-[1px] focus:-translate-y-[1px]",
      underline:
        "bg-background/50 border-b-4 border-ink p-3 focus:bg-primary-container",
      dark:
        "bg-transparent border-b-4 border-white text-white p-2 focus:border-primary-container placeholder:text-white/30",
    };

    return (
      <input
        ref={ref}
        className={cn(base, variants[variant], className)}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
