import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

/* ─── Shadow tiers ─────────────────────────────────────────────── */
const shadowMap = {
  none: '',
  sm: 'shadow-[3px_3px_0px_#1A1A1A]',
  md: 'shadow-[6px_6px_0px_#1A1A1A]',
  lg: 'shadow-[8px_8px_0px_#1A1A1A]',
  aggressive: 'shadow-[12px_12px_0px_#1A1A1A]',
} as const;

/* ─── Card root ────────────────────────────────────────────────── */
const cardVariants = cva(
  "bg-white border-3 border-ink overflow-hidden",
  {
    variants: {
      shadow: {
        none: shadowMap.none,
        sm: shadowMap.sm,
        md: shadowMap.md,
        lg: shadowMap.lg,
        aggressive: shadowMap.aggressive,
      },
      interactive: {
        true: "hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#1A1A1A] transition-all cursor-pointer",
        false: "",
      },
    },
    defaultVariants: {
      shadow: "md",
      interactive: false,
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, shadow, interactive, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ shadow, interactive, className }))}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

/* ─── Card sub-components ──────────────────────────────────────── */
export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6 md:p-8 border-b-3 border-ink", className)} {...props} />
);
CardHeader.displayName = "CardHeader";

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6", className)} {...props} />
);
CardContent.displayName = "CardContent";

export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-4 border-t-3 border-ink", className)} {...props} />
);
CardFooter.displayName = "CardFooter";

export { cardVariants, shadowMap };
