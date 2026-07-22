import { clsx } from "clsx";
import { forwardRef, type HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  readonly variant?: "compact" | "standard";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant = "standard", ...props },
  ref,
) {
  return <div className={clsx("dl-card", `dl-card--${variant}`, className)} ref={ref} {...props} />;
});

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...props }, ref) {
    return <div className={clsx("dl-card__header", className)} ref={ref} {...props} />;
  },
);

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...props }, ref) {
    return <h3 className={clsx("dl-card__title", className)} ref={ref} {...props} />;
  },
);

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function CardDescription({ className, ...props }, ref) {
    return <p className={clsx("dl-card__description", className)} ref={ref} {...props} />;
  },
);

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardContent({ className, ...props }, ref) {
    return <div className={clsx("dl-card__content", className)} ref={ref} {...props} />;
  },
);

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...props }, ref) {
    return <div className={clsx("dl-card__footer", className)} ref={ref} {...props} />;
  },
);
