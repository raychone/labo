import { clsx } from "clsx";
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { Field, FieldDescription, FieldError, FieldLabel } from "./field.js";

interface FieldControlProps {
  readonly error?: ReactNode;
  readonly hint?: ReactNode;
  readonly label: ReactNode;
}

function createDescribedBy(hintId: string, errorId: string, hasHint: boolean, hasError: boolean): string | undefined {
  const ids = [hasHint ? hintId : undefined, hasError ? errorId : undefined].filter(
    (id): id is string => id !== undefined,
  );

  return ids.length > 0 ? ids.join(" ") : undefined;
}

export interface TextInputProps
  extends FieldControlProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  readonly type?: "email" | "password" | "search" | "tel" | "text" | "url";
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { className, error, hint, id, label, required, type = "text", ...props },
  ref,
) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const hasHint = hint !== undefined;
  const hasError = error !== undefined;

  return (
    <Field>
      <FieldLabel htmlFor={controlId} isRequired={required === true}>
        {label}
      </FieldLabel>
      {hasHint ? <FieldDescription id={hintId}>{hint}</FieldDescription> : null}
      <input
        aria-describedby={createDescribedBy(hintId, errorId, hasHint, hasError)}
        aria-invalid={hasError || undefined}
        className={clsx("dl-control", className)}
        id={controlId}
        ref={ref}
        required={required}
        type={type}
        {...props}
      />
      {hasError ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  );
});

export interface NumberInputProps
  extends FieldControlProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  props,
  ref,
) {
  return <TextInput inputMode="decimal" ref={ref} type="text" {...props} />;
});

export interface DateInputProps
  extends FieldControlProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { className, error, hint, id, label, required, ...props },
  ref,
) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const hasHint = hint !== undefined;
  const hasError = error !== undefined;

  return (
    <Field>
      <FieldLabel htmlFor={controlId} isRequired={required === true}>
        {label}
      </FieldLabel>
      {hasHint ? <FieldDescription id={hintId}>{hint}</FieldDescription> : null}
      <input
        aria-describedby={createDescribedBy(hintId, errorId, hasHint, hasError)}
        aria-invalid={hasError || undefined}
        className={clsx("dl-control", className)}
        id={controlId}
        ref={ref}
        required={required}
        type="date"
        {...props}
      />
      {hasError ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  );
});

export interface TextareaProps extends FieldControlProps, TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, error, hint, id, label, required, ...props },
  ref,
) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const hasHint = hint !== undefined;
  const hasError = error !== undefined;

  return (
    <Field>
      <FieldLabel htmlFor={controlId} isRequired={required === true}>
        {label}
      </FieldLabel>
      {hasHint ? <FieldDescription id={hintId}>{hint}</FieldDescription> : null}
      <textarea
        aria-describedby={createDescribedBy(hintId, errorId, hasHint, hasError)}
        aria-invalid={hasError || undefined}
        className={clsx("dl-control", className)}
        id={controlId}
        ref={ref}
        required={required}
        {...props}
      />
      {hasError ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  );
});

export interface SelectOption {
  readonly disabled?: boolean;
  readonly label: string;
  readonly value: string;
}

export interface SelectProps
  extends FieldControlProps,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  readonly options: readonly SelectOption[];
  readonly placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, error, hint, id, label, options, placeholder, required, ...props },
  ref,
) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const hasHint = hint !== undefined;
  const hasError = error !== undefined;

  return (
    <Field>
      <FieldLabel htmlFor={controlId} isRequired={required === true}>
        {label}
      </FieldLabel>
      {hasHint ? <FieldDescription id={hintId}>{hint}</FieldDescription> : null}
      <select
        aria-describedby={createDescribedBy(hintId, errorId, hasHint, hasError)}
        aria-invalid={hasError || undefined}
        className={clsx("dl-control", className)}
        id={controlId}
        ref={ref}
        required={required}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option disabled={option.disabled} key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hasError ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  );
});
