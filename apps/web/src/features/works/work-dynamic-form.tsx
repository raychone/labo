import {
  Checkbox,
  DateInput,
  FormGrid,
  FormGridFull,
  LoadingState,
  NumberInput,
  RadioGroup,
  Select,
  TextInput,
  Textarea,
} from "@dental-lab/ui";
import {
  FDI_TOOTH_CODES,
  toWorkFormDisplayValues,
  type WorkFormFieldDefinition,
  type WorkFormFieldType,
  type WorkFormSubmissionView,
  type WorkFormValue,
} from "@dental-lab/shared";
import type { ReactNode } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";

import type { WorkFormValues } from "./works-page.schema.js";

function getFieldError(form: UseFormReturn<WorkFormValues>, fieldKey: string): string | undefined {
  const valueErrors = form.formState.errors.workFormValues as Record<string, { readonly message?: string } | undefined> | undefined;
  return valueErrors?.[fieldKey]?.message;
}

function getFieldValue(form: UseFormReturn<WorkFormValues>, fieldKey: string): WorkFormValue {
  return form.watch(`workFormValues.${fieldKey}`) as WorkFormValue;
}

function isFullWidth(type: WorkFormFieldType): boolean {
  return type === "TEXTAREA" || type === "TOOTH" || type === "MULTISELECT";
}

export function WorkFormLoadingState(): ReactNode {
  return <LoadingState text="Se încarcă formularul specific" />;
}

export function WorkFormEmptyState(): ReactNode {
  return <p className="works-page__muted">Acest tip de lucrare nu are un formular specific configurat.</p>;
}

export function WorkFormFields({
  fields,
  form,
  isDisabled,
}: {
  readonly fields: readonly WorkFormFieldDefinition[];
  readonly form: UseFormReturn<WorkFormValues>;
  readonly isDisabled: boolean;
}): ReactNode {
  return (
    <FormGrid>
      {fields.map((field) => {
        const content = <WorkFormFieldRenderer field={field} form={form} isDisabled={isDisabled} />;
        return isFullWidth(field.type)
          ? <FormGridFull key={field.key}>{content}</FormGridFull>
          : <div key={field.key}>{content}</div>;
      })}
    </FormGrid>
  );
}

export function WorkFormFieldRenderer({
  field,
  form,
  isDisabled,
}: {
  readonly field: WorkFormFieldDefinition;
  readonly form: UseFormReturn<WorkFormValues>;
  readonly isDisabled: boolean;
}): ReactNode {
  const id = `workFormValues.${field.key}`;
  const error = getFieldError(form, field.key);
  const common = {
    disabled: isDisabled,
    error,
    hint: field.helpText ?? undefined,
    id,
    label: field.label,
    required: field.required,
  };

  if (field.type === "TEXTAREA") {
    return <Textarea {...common} placeholder={field.placeholder ?? undefined} rows={4} {...form.register(`workFormValues.${field.key}`)} />;
  }

  if (field.type === "NUMBER") {
    return <NumberInput {...common} placeholder={field.placeholder ?? undefined} {...form.register(`workFormValues.${field.key}`, { valueAsNumber: true })} />;
  }

  if (field.type === "DATE") {
    return <DateInput {...common} {...form.register(`workFormValues.${field.key}`)} />;
  }

  if (field.type === "CHECKBOX") {
    return (
      <Controller
        control={form.control}
        name={`workFormValues.${field.key}`}
        render={({ field: controllerField }) => (
          <Checkbox
            {...common}
            checked={Boolean(controllerField.value)}
            onChange={(event) => controllerField.onChange(event.target.checked)}
          />
        )}
      />
    );
  }

  if (field.type === "RADIO") {
    return (
      <Controller
        control={form.control}
        name={`workFormValues.${field.key}`}
        render={({ field: controllerField }) => (
          <RadioGroup
            {...common}
            onValueChange={controllerField.onChange}
            options={field.options}
            value={typeof controllerField.value === "string" ? controllerField.value : ""}
          />
        )}
      />
    );
  }

  if (field.type === "SELECT" || field.type === "SHADE") {
    return <Select {...common} options={field.options} placeholder={field.placeholder ?? "Alege opțiunea"} {...form.register(`workFormValues.${field.key}`)} />;
  }

  if (field.type === "MULTISELECT") {
    return <MultiSelectField field={field} form={form} isDisabled={isDisabled} />;
  }

  if (field.type === "TOOTH") {
    return <ToothField field={field} form={form} isDisabled={isDisabled} />;
  }

  return <TextInput {...common} placeholder={field.placeholder ?? undefined} {...form.register(`workFormValues.${field.key}`)} />;
}

export function MultiSelectField({
  field,
  form,
  isDisabled,
}: {
  readonly field: WorkFormFieldDefinition;
  readonly form: UseFormReturn<WorkFormValues>;
  readonly isDisabled: boolean;
}): ReactNode {
  const selected = new Set(Array.isArray(getFieldValue(form, field.key)) ? getFieldValue(form, field.key) as readonly string[] : []);

  function toggle(value: string): void {
    const next = new Set(selected);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    form.setValue(`workFormValues.${field.key}`, [...next], { shouldDirty: true, shouldValidate: true });
  }

  return (
    <fieldset className="works-page__choice-field" id={`workFormValues.${field.key}`}>
      <legend>{field.label}{field.required ? " *" : ""}</legend>
      {field.helpText ? <p>{field.helpText}</p> : null}
      <div className="works-page__choice-grid">
        {field.options.map((option) => (
          <Checkbox
            checked={selected.has(option.value)}
            disabled={isDisabled}
            id={`workFormValues.${field.key}.${option.value}`}
            key={option.value}
            label={option.label}
            onChange={() => toggle(option.value)}
          />
        ))}
      </div>
      {getFieldError(form, field.key) ? <p className="dl-field-error">{getFieldError(form, field.key)}</p> : null}
    </fieldset>
  );
}

export function ToothField({
  field,
  form,
  isDisabled,
}: {
  readonly field: WorkFormFieldDefinition;
  readonly form: UseFormReturn<WorkFormValues>;
  readonly isDisabled: boolean;
}): ReactNode {
  const selected = new Set(Array.isArray(getFieldValue(form, field.key)) ? getFieldValue(form, field.key) as readonly string[] : []);

  function toggle(value: string): void {
    const next = new Set(selected);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    form.setValue(`workFormValues.${field.key}`, [...next], { shouldDirty: true, shouldValidate: true });
  }

  return (
    <fieldset className="works-page__tooth-field" id={`workFormValues.${field.key}`}>
      <legend>{field.label}{field.required ? " *" : ""}</legend>
      {field.helpText ? <p>{field.helpText}</p> : null}
      <div className="works-page__tooth-grid">
        {FDI_TOOTH_CODES.map((tooth) => (
          <button
            aria-pressed={selected.has(tooth)}
            className="works-page__tooth-button"
            disabled={isDisabled}
            key={tooth}
            onClick={() => toggle(tooth)}
            type="button"
          >
            {tooth}
          </button>
        ))}
      </div>
      {getFieldError(form, field.key) ? <p className="dl-field-error">{getFieldError(form, field.key)}</p> : null}
    </fieldset>
  );
}

export function WorkFormReadOnlyView({ submission }: { readonly submission: WorkFormSubmissionView | null }): ReactNode {
  if (!submission) {
    return <p className="works-page__muted">Această lucrare a fost creată înainte de activarea formularului specific sau tipul nu are formular configurat.</p>;
  }

  const displayValues = toWorkFormDisplayValues(submission.fields, submission.values);

  return (
    <section className="works-page__snapshot" aria-labelledby="work-form-snapshot-title">
      <div>
        <h3 id="work-form-snapshot-title">Detalii specifice lucrării</h3>
        <p className="works-page__muted">{submission.templateName} · versiunea {submission.templateVersion}</p>
      </div>
      {displayValues.length > 0 ? (
        <dl className="works-page__snapshot-list">
          {displayValues.map((item) => (
            <div key={item.fieldKey}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="works-page__muted">Nu există valori completate pentru câmpurile opționale.</p>
      )}
    </section>
  );
}
