import { Button, Select, TextInput, Textarea } from "@dental-lab/ui";
import type { WorkTypeDetail } from "@dental-lab/shared";
import { minorToDecimalString } from "@dental-lab/shared";
import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { WorkTypeFormValues } from "./work-types-page.schema.js";

export const workTypeUnitOptions = [{ label: "Unitate", value: "UNIT" }] as const;

export const defaultWorkTypeFormValues: WorkTypeFormValues = {
  basePriceDecimal: "0.00",
  description: null,
  name: "",
  unit: "UNIT",
};

export function toWorkTypeFormValues(workType: WorkTypeDetail | undefined): WorkTypeFormValues {
  if (!workType) {
    return defaultWorkTypeFormValues;
  }

  return {
    basePriceDecimal: minorToDecimalString(workType.basePriceMinor),
    description: workType.description,
    name: workType.name,
    unit: workType.unit,
  };
}

export function WorkTypeForm({
  currency,
  form,
  formId,
  isDisabled,
  onSubmit,
}: {
  readonly currency: string;
  readonly form: UseFormReturn<WorkTypeFormValues>;
  readonly formId: string;
  readonly isDisabled: boolean;
  readonly onSubmit: (values: WorkTypeFormValues) => void;
}): ReactNode {
  return (
    <form className="work-types-page__form" id={formId} onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
      <fieldset className="work-types-page__fieldset">
        <legend>Identificare</legend>
        <div className="work-types-page__form-grid">
          <TextInput disabled={isDisabled} error={form.formState.errors.name?.message} label="Denumire" {...form.register("name")} />
          <Select disabled={isDisabled} error={form.formState.errors.unit?.message} label="Unitate tarifare" options={workTypeUnitOptions} {...form.register("unit")} />
        </div>
      </fieldset>
      <fieldset className="work-types-page__fieldset">
        <legend>Pricing</legend>
        <div className="work-types-page__form-grid">
          <TextInput
            disabled={isDisabled}
            error={form.formState.errors.basePriceDecimal?.message}
            inputMode="decimal"
            label={`Pret de baza (${currency})`}
            {...form.register("basePriceDecimal")}
          />
        </div>
      </fieldset>
      <Textarea disabled={isDisabled} error={form.formState.errors.description?.message} label="Descriere" rows={4} {...form.register("description")} />
    </form>
  );
}

export function WorkTypeFormActions({
  canReset,
  formId,
  isSaving,
  onReset,
  submitLabel,
}: {
  readonly canReset: boolean;
  readonly formId: string;
  readonly isSaving: boolean;
  readonly onReset: () => void;
  readonly submitLabel: string;
}): ReactNode {
  return (
    <div className="work-types-page__actions">
      <Button disabled={isSaving} form={formId} isLoading={isSaving} type="submit">
        {submitLabel}
      </Button>
      <Button disabled={!canReset || isSaving} onClick={onReset} variant="outline">
        Revino
      </Button>
    </div>
  );
}
