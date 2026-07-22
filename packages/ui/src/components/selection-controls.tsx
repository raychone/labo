import { clsx } from "clsx";
import {
  forwardRef,
  useId,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import { FieldDescription, FieldError } from "./field.js";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  readonly description?: ReactNode;
  readonly error?: ReactNode;
  readonly label: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, description, error, id, label, ...props },
  ref,
) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptionId = `${controlId}-description`;
  const errorId = `${controlId}-error`;

  return (
    <div className="dl-choice-field">
      <label className={clsx("dl-choice", className)} htmlFor={controlId}>
        <input
          aria-describedby={description !== undefined ? descriptionId : undefined}
          aria-invalid={error !== undefined || undefined}
          className="dl-choice__input"
          id={controlId}
          ref={ref}
          type="checkbox"
          {...props}
        />
        <span className="dl-choice__box" aria-hidden="true" />
        <span className="dl-choice__label">{label}</span>
      </label>
      {description !== undefined ? (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      ) : null}
      {error !== undefined ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
});

export interface RadioOption {
  readonly description?: ReactNode;
  readonly disabled?: boolean;
  readonly label: ReactNode;
  readonly value: string;
}

export interface RadioGroupProps {
  readonly className?: string;
  readonly description?: ReactNode;
  readonly disabled?: boolean;
  readonly error?: ReactNode;
  readonly label: ReactNode;
  readonly name?: string;
  readonly onValueChange?: (value: string) => void;
  readonly options: readonly RadioOption[];
  readonly required?: boolean;
  readonly value?: string;
}

export function RadioGroup({
  className,
  description,
  disabled = false,
  error,
  label,
  name,
  onValueChange,
  options,
  required = false,
  value,
}: RadioGroupProps): ReactNode {
  const generatedId = useId();
  const groupName = name ?? `${generatedId}-radio`;
  const labelId = `${generatedId}-label`;
  const descriptionId = `${generatedId}-description`;

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    onValueChange?.(event.target.value);
  }

  return (
    <fieldset
      aria-describedby={description !== undefined ? descriptionId : undefined}
      aria-invalid={error !== undefined || undefined}
      aria-labelledby={labelId}
      className={clsx("dl-radio-group", className)}
    >
      <legend className="dl-field__label" id={labelId}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </legend>
      {description !== undefined ? (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      ) : null}
      <div className="dl-radio-group__options">
        {options.map((option) => (
          <label className="dl-choice" key={option.value}>
            <input
              checked={value === option.value}
              className="dl-choice__input"
              disabled={disabled || option.disabled}
              name={groupName}
              onChange={handleChange}
              required={required}
              type="radio"
              value={option.value}
            />
            <span className="dl-choice__box dl-choice__box--radio" aria-hidden="true" />
            <span className="dl-choice__label">
              {option.label}
              {option.description !== undefined ? (
                <span className="dl-choice__description">{option.description}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
      {error !== undefined ? <FieldError>{error}</FieldError> : null}
    </fieldset>
  );
}

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  readonly description?: ReactNode;
  readonly label: ReactNode;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { className, description, id, label, ...props },
  ref,
) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptionId = `${controlId}-description`;

  return (
    <div className="dl-choice-field">
      <label className={clsx("dl-switch", className)} htmlFor={controlId}>
        <input
          aria-describedby={description !== undefined ? descriptionId : undefined}
          className="dl-switch__input"
          id={controlId}
          ref={ref}
          role="switch"
          type="checkbox"
          {...props}
        />
        <span className="dl-switch__track" aria-hidden="true">
          <span className="dl-switch__thumb" />
        </span>
        <span className="dl-choice__label">{label}</span>
      </label>
      {description !== undefined ? (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      ) : null}
    </div>
  );
});
