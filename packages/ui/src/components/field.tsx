import { clsx } from "clsx";
import { forwardRef, type HTMLAttributes, type LabelHTMLAttributes, type ReactNode } from "react";

export interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
}

export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  { children, className, ...props },
  ref,
) {
  return (
    <div className={clsx("dl-field", className)} ref={ref} {...props}>
      {children}
    </div>
  );
});

export interface FieldLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  readonly isRequired?: boolean;
}

export const FieldLabel = forwardRef<HTMLLabelElement, FieldLabelProps>(function FieldLabel(
  { children, className, isRequired = false, ...props },
  ref,
) {
  return (
    <span className="dl-field__label-row">
      <label className={clsx("dl-field__label", className)} ref={ref} {...props}>
        {children}
      </label>
      {isRequired ? <span aria-hidden="true" className="dl-field__required">*</span> : null}
    </span>
  );
});

export interface FieldDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  readonly children: ReactNode;
}

export const FieldDescription = forwardRef<HTMLParagraphElement, FieldDescriptionProps>(
  function FieldDescription({ children, className, ...props }, ref) {
    return (
      <p className={clsx("dl-field__description", className)} ref={ref} {...props}>
        {children}
      </p>
    );
  },
);

export interface FieldErrorProps extends HTMLAttributes<HTMLParagraphElement> {
  readonly children: ReactNode;
}

export const FieldError = forwardRef<HTMLParagraphElement, FieldErrorProps>(function FieldError(
  { children, className, ...props },
  ref,
) {
  return (
    <p className={clsx("dl-field__error", className)} ref={ref} role="alert" {...props}>
      {children}
    </p>
  );
});
