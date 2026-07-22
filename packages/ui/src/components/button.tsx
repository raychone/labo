import { clsx } from "clsx";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "small" | "medium" | "large";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly fullWidth?: boolean;
  readonly isLoading?: boolean;
  readonly leadingIcon?: ReactNode;
  readonly size?: ButtonSize;
  readonly trailingIcon?: ReactNode;
  readonly variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    disabled,
    fullWidth = false,
    isLoading = false,
    leadingIcon,
    size = "medium",
    trailingIcon,
    type = "button",
    variant = "primary",
    ...props
  },
  ref,
) {
  return (
    <button
      aria-busy={isLoading || undefined}
      className={clsx(
        "dl-button",
        `dl-button--${variant}`,
        `dl-button--${size}`,
        fullWidth && "dl-button--full",
        className,
      )}
      disabled={disabled === true || isLoading}
      ref={ref}
      type={type}
      {...props}
    >
      <span className="dl-button__content" data-loading={isLoading ? "true" : undefined}>
        {leadingIcon ? <span className="dl-button__icon">{leadingIcon}</span> : null}
        <span>{children}</span>
        {trailingIcon ? <span className="dl-button__icon">{trailingIcon}</span> : null}
      </span>
      {isLoading ? <span className="dl-button__spinner" aria-hidden="true" /> : null}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonProps, "children" | "leadingIcon" | "trailingIcon"> {
  readonly "aria-label": string;
  readonly icon: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, icon, size = "medium", ...props },
  ref,
) {
  return (
    <Button
      className={clsx("dl-icon-button", className)}
      ref={ref}
      size={size}
      {...props}
    >
      <span aria-hidden="true">{icon}</span>
    </Button>
  );
});
