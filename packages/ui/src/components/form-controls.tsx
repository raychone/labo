import { clsx } from "clsx";
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
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
  readonly secondary?: ReactNode;
  readonly value: string;
}

export interface SelectProps
  extends FieldControlProps,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  readonly labelClassName?: string;
  readonly options: readonly SelectOption[];
  readonly placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    className,
    defaultValue,
    disabled,
    error,
    hint,
    id,
    label,
    labelClassName,
    name,
    onBlur,
    onChange,
    options,
    placeholder,
    required,
    value,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const hasHint = hint !== undefined;
  const hasError = error !== undefined;
  const nativeRef = useRef<HTMLSelectElement>(null);
  const [isOpen, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const initialValue = typeof value === "string" ? value : typeof defaultValue === "string" ? defaultValue : "";
  const [selectedValue, setSelectedValue] = useState(initialValue);
  const listboxId = `${controlId}-options`;

  useImperativeHandle(ref, () => nativeRef.current as HTMLSelectElement);

  useEffect(() => {
    if (typeof value === "string") {
      setSelectedValue(value);
    }
  }, [value]);

  const selectedOption = options.find((option) => option.value === selectedValue);
  const normalizedSearch = searchValue.trim().toLocaleLowerCase();
  const visibleOptions = normalizedSearch === ""
    ? options
    : options.filter((option) => `${option.label} ${option.value}`.toLocaleLowerCase().includes(normalizedSearch));

  function selectOption(nextValue: string): void {
    setSelectedValue(nextValue);
    const option = options.find((candidate) => candidate.value === nextValue);
    setSearchValue(option?.label ?? "");
    setOpen(false);

    const nativeSelect = nativeRef.current;
    if (nativeSelect) {
      nativeSelect.value = nextValue;
      nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      return;
    }

    if (event.key === "Enter" && visibleOptions.length > 0) {
      event.preventDefault();
      const firstOption = visibleOptions[0];
      if (firstOption) {
        selectOption(firstOption.value);
      }
    }
  }

  return (
    <Field className="dl-select-field">
      <FieldLabel className={labelClassName} htmlFor={controlId} isRequired={required === true}>
        {label}
      </FieldLabel>
      {hasHint ? <FieldDescription id={hintId}>{hint}</FieldDescription> : null}
      <div className={clsx("dl-select", isOpen && "dl-select--open", disabled && "dl-select--disabled")}>
        <input
          aria-activedescendant={undefined}
          aria-autocomplete="list"
          aria-controls={isOpen ? listboxId : undefined}
          aria-describedby={createDescribedBy(hintId, errorId, hasHint, hasError)}
          aria-expanded={isOpen}
          aria-invalid={hasError || undefined}
          aria-label={typeof props["aria-label"] === "string" ? props["aria-label"] : undefined}
          autoComplete="off"
          className={clsx("dl-control", "dl-select__search", className)}
          disabled={disabled}
          id={controlId}
          onBlur={(event) => {
            onBlur?.(event as unknown as React.FocusEvent<HTMLSelectElement>);
            window.setTimeout(() => setOpen(false), 120);
          }}
          onChange={(event) => {
            const nextSearch = event.target.value;
            setSearchValue(nextSearch);
            setOpen(true);
          }}
          onFocus={() => {
            setSearchValue(selectedOption?.label ?? "");
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Selectează o opțiune"}
          role="combobox"
          type="search"
          value={isOpen ? searchValue : selectedOption?.label ?? ""}
        />
        <span aria-hidden="true" className="dl-select__chevron" />
        {isOpen ? (
          <div aria-label={`Opțiuni pentru ${String(label).toLocaleLowerCase()}`} className="dl-select__menu" id={listboxId} role="listbox">
            {visibleOptions.length > 0 ? visibleOptions.map((option) => (
              <button
                aria-selected={option.value === selectedValue}
                className={clsx(
                  "dl-select__option",
                  option.value === selectedValue && "dl-select__option--selected",
                  option.disabled && "dl-select__option--disabled",
                )}
                disabled={option.disabled}
                key={option.value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  if (!option.disabled) {
                    selectOption(option.value);
                  }
                }}
                role="option"
                type="button"
              >
                <strong>{option.label}</strong>
                {option.value === selectedValue ? <span aria-hidden="true" className="dl-select__check">✓</span> : null}
                {option.secondary ? <small>{option.secondary}</small> : null}
              </button>
            )) : <p className="dl-select__empty">Nu există opțiuni potrivite.</p>}
          </div>
        ) : null}
      </div>
      <select
        aria-hidden="true"
        className="dl-select__native"
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        onChange={onChange}
        ref={nativeRef}
        required={required}
        value={value}
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
