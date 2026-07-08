import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const badgeVariants = cva(
  "inline-flex items-center font-bold uppercase tracking-widest border-2 border-ink",
  {
    variants: {
      variant: {
        default: "bg-ink text-white",
        primary: "bg-primary-container text-ink",
        secondary: "bg-secondary text-white",
        success: "bg-tertiary text-white",
        warning: "bg-primary-container text-ink",
        danger: "bg-error text-white",
        outline: "bg-white text-ink",
        tertiary: "bg-tertiary text-white",
      },
      size: {
        sm: "px-2 py-0.5 text-[8px]",
        default: "px-3 py-1 text-[10px]",
        lg: "px-4 py-1.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

// eslint-disable-next-line react-refresh/only-export-components
export { badgeVariants };
