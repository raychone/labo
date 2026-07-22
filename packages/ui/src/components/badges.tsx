import { clsx } from "clsx";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

export type StatusBadgeVariant =
  | "approved"
  | "awaiting"
  | "cancelled"
  | "closed"
  | "delivered"
  | "delivery"
  | "draft"
  | "invoiced"
  | "paid"
  | "payment"
  | "planned"
  | "production"
  | "quality"
  | "registered"
  | "rejected";

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly icon?: ReactNode;
  readonly label: string;
  readonly variant: StatusBadgeVariant;
}

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(function StatusBadge(
  { className, icon, label, variant, ...props },
  ref,
) {
  return (
    <span
      className={clsx("dl-badge", "dl-status-badge", `dl-status-badge--${variant}`, className)}
      ref={ref}
      {...props}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <span>{label}</span>
    </span>
  );
});

export type PriorityBadgeVariant = "high" | "low" | "normal" | "urgent";

export interface PriorityBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly label: string;
  readonly variant: PriorityBadgeVariant;
}

export const PriorityBadge = forwardRef<HTMLSpanElement, PriorityBadgeProps>(function PriorityBadge(
  { className, label, variant, ...props },
  ref,
) {
  return (
    <span className={clsx("dl-badge", `dl-priority-badge--${variant}`, className)} ref={ref} {...props}>
      {label}
    </span>
  );
});
