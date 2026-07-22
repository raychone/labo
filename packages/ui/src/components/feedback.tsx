import { clsx } from "clsx";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

export interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  readonly size?: "large" | "medium" | "small";
  readonly text?: ReactNode;
}

export const LoadingState = forwardRef<HTMLDivElement, LoadingStateProps>(function LoadingState(
  { className, size = "medium", text = "Loading", ...props },
  ref,
) {
  return (
    <div
      aria-live="polite"
      className={clsx("dl-state", "dl-loading-state", `dl-loading-state--${size}`, className)}
      ref={ref}
      role="status"
      {...props}
    >
      <span className="dl-loading-state__spinner" aria-hidden="true" />
      {text ? <span>{text}</span> : null}
    </div>
  );
});

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  readonly action?: ReactNode;
  readonly description?: ReactNode;
  readonly icon?: ReactNode;
  readonly title: ReactNode;
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { action, className, description, icon, title, ...props },
  ref,
) {
  return (
    <div className={clsx("dl-state", "dl-empty-state", className)} ref={ref} {...props}>
      {icon ? <div className="dl-state__icon" aria-hidden="true">{icon}</div> : null}
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className="dl-state__action">{action}</div> : null}
    </div>
  );
});

export interface ErrorStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  readonly description?: ReactNode;
  readonly retryAction?: ReactNode;
  readonly title: ReactNode;
}

export const ErrorState = forwardRef<HTMLDivElement, ErrorStateProps>(function ErrorState(
  { className, description, retryAction, title, ...props },
  ref,
) {
  return (
    <div className={clsx("dl-state", "dl-error-state", className)} ref={ref} role="alert" {...props}>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {retryAction ? <div className="dl-state__action">{retryAction}</div> : null}
    </div>
  );
});
