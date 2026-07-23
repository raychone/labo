import { clsx } from "clsx";
import {
  forwardRef,
  type FormHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { Button, type ButtonVariant } from "./button.js";
import { Modal } from "./overlay.js";

export interface FormLayoutProps extends FormHTMLAttributes<HTMLFormElement> {
  readonly children: ReactNode;
}

export const FormLayout = forwardRef<HTMLFormElement, FormLayoutProps>(function FormLayout(
  { children, className, ...props },
  ref,
) {
  return (
    <form className={clsx("dl-form", className)} ref={ref} {...props}>
      {children}
    </form>
  );
});

export interface FormSectionProps extends Omit<HTMLAttributes<HTMLFieldSetElement>, "title"> {
  readonly children: ReactNode;
  readonly description?: ReactNode;
  readonly title: ReactNode;
}

export const FormSection = forwardRef<HTMLFieldSetElement, FormSectionProps>(function FormSection(
  { children, className, description, title, ...props },
  ref,
) {
  return (
    <fieldset className={clsx("dl-form-section", className)} ref={ref} {...props}>
      <legend className="dl-form-section__legend">{title}</legend>
      {description ? <p className="dl-form-section__description">{description}</p> : null}
      <div className="dl-form-section__content">{children}</div>
    </fieldset>
  );
});

export interface FormGridProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
}

export const FormGrid = forwardRef<HTMLDivElement, FormGridProps>(function FormGrid(
  { children, className, ...props },
  ref,
) {
  return (
    <div className={clsx("dl-form-grid", className)} ref={ref} {...props}>
      {children}
    </div>
  );
});

export interface FormGridFullProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
}

export const FormGridFull = forwardRef<HTMLDivElement, FormGridFullProps>(function FormGridFull(
  { children, className, ...props },
  ref,
) {
  return (
    <div className={clsx("dl-form-grid__full", className)} ref={ref} {...props}>
      {children}
    </div>
  );
});

export interface FormErrorSummaryItem {
  readonly fieldId?: string;
  readonly message: string;
}

export interface FormErrorSummaryProps extends HTMLAttributes<HTMLDivElement> {
  readonly errors: readonly FormErrorSummaryItem[];
  readonly title?: string;
}

export const FormErrorSummary = forwardRef<HTMLDivElement, FormErrorSummaryProps>(
  function FormErrorSummary({ className, errors, title = "Verifica urmatoarele campuri:", ...props }, ref) {
    if (errors.length === 0) {
      return null;
    }

    return (
      <div className={clsx("dl-form-error-summary", className)} ref={ref} role="alert" tabIndex={-1} {...props}>
        <p className="dl-form-error-summary__title">{title}</p>
        <ul>
          {errors.map((error, index) => (
            <li key={`${error.fieldId ?? "form"}-${index}`}>
              {error.fieldId ? (
                <a href={`#${error.fieldId}`}>{error.message}</a>
              ) : (
                <span>{error.message}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  },
);

export interface FormActionsProps extends HTMLAttributes<HTMLDivElement> {
  readonly cancelLabel?: string;
  readonly canReset?: boolean;
  readonly formId?: string;
  readonly isSubmitting?: boolean;
  readonly onCancel?: () => void;
  readonly onReset?: () => void;
  readonly resetLabel?: string;
  readonly submitLabel: string;
  readonly submitDisabled?: boolean;
  readonly submitVariant?: ButtonVariant;
}

export const FormActions = forwardRef<HTMLDivElement, FormActionsProps>(function FormActions(
  {
    cancelLabel = "Anuleaza",
    canReset = false,
    className,
    formId,
    isSubmitting = false,
    onCancel,
    onReset,
    resetLabel = "Revino",
    submitDisabled = false,
    submitLabel,
    submitVariant = "primary",
    ...props
  },
  ref,
) {
  return (
    <div className={clsx("dl-form-actions", className)} ref={ref} {...props}>
      <Button disabled={submitDisabled} form={formId} isLoading={isSubmitting} type="submit" variant={submitVariant}>
        {submitLabel}
      </Button>
      {onReset ? (
        <Button disabled={!canReset || isSubmitting} onClick={onReset} type="button" variant="outline">
          {resetLabel}
        </Button>
      ) : null}
      {onCancel ? (
        <Button disabled={isSubmitting} onClick={onCancel} type="button" variant="secondary">
          {cancelLabel}
        </Button>
      ) : null}
    </div>
  );
});

export interface ConfirmActionModalProps {
  readonly confirmLabel: string;
  readonly description: ReactNode;
  readonly isLoading?: boolean;
  readonly isOpen: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly title: string;
  readonly variant?: ButtonVariant;
}

export function ConfirmActionModal({
  confirmLabel,
  description,
  isLoading = false,
  isOpen,
  onCancel,
  onConfirm,
  title,
  variant = "danger",
}: ConfirmActionModalProps): ReactNode {
  return (
    <Modal
      footer={(
        <div className="dl-form-confirm-actions">
          <Button disabled={isLoading} onClick={onCancel} type="button" variant="secondary">
            Anuleaza
          </Button>
          <Button isLoading={isLoading} onClick={onConfirm} type="button" variant={variant}>
            {confirmLabel}
          </Button>
        </div>
      )}
      isOpen={isOpen}
      onOpenChange={(nextIsOpen) => {
        if (!nextIsOpen && !isLoading) {
          onCancel();
        }
      }}
      title={title}
    >
      <p>{description}</p>
    </Modal>
  );
}
