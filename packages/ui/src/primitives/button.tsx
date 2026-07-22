import type { ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly children: ReactNode;
  readonly isLoading?: boolean;
  readonly variant?: ButtonVariant;
}

export function Button({
  children,
  className,
  disabled,
  isLoading = false,
  type = "button",
  variant = "primary",
  ...buttonProps
}: ButtonProps): ReactNode {
  return (
    <button
      className={clsx("dl-button", `dl-button--${variant}`, className)}
      disabled={disabled === true || isLoading}
      type={type}
      {...buttonProps}
    >
      {isLoading ? "Loading" : children}
    </button>
  );
}
