import {
  FormActions,
  FormErrorSummary,
  FormGrid,
  FormGridFull,
  FormLayout,
  FormSection,
  Select,
  TextInput,
  Textarea,
} from "@dental-lab/ui";
import type { WorkTypeDetail } from "@dental-lab/shared";
import { minorToDecimalString } from "@dental-lab/shared";
import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { WorkTypeFormValues } from "./work-types-page.schema.js";
import { getFormErrorSummaryItems, useErrorSummaryFocus } from "../../lib/form-utils.js";

export const workTypeUnitOptions = [{ label: "Unitate", value: "UNIT" }] as const;

export const defaultWorkTypeFormValues: WorkTypeFormValues = {
  basePriceDecimal: "0.00",
  description: null,
  name: "",
  symbol: "",
  unit: "UNIT",
};

const workTypeFieldLabels: Record<keyof WorkTypeFormValues, string> = {
  basePriceDecimal: "Preț de bază",
  description: "Descriere",
  name: "Denumire",
  symbol: "Simbol",
  unit: "Unitate tarifare",
};

export function toWorkTypeFormValues(workType: WorkTypeDetail | undefined): WorkTypeFormValues {
  if (!workType) {
    return defaultWorkTypeFormValues;
  }

  return {
    basePriceDecimal: workType.basePriceMinor === null ? "" : minorToDecimalString(workType.basePriceMinor),
    description: workType.description,
    name: workType.name,
    symbol: workType.symbol,
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
  const summaryRef = useErrorSummaryFocus(form.formState.errors, form.formState.submitCount);
  const summaryItems = form.formState.submitCount > 0
    ? getFormErrorSummaryItems(form.formState.errors, workTypeFieldLabels)
    : [];

  return (
    <FormLayout className="work-types-page__form" id={formId} onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
      <FormErrorSummary errors={summaryItems} ref={summaryRef} />
      <FormSection title="Identificare" description="Codul intern este generat de backend; simbolul este afișarea operațională scurtă.">
        <FormGrid>
          <TextInput disabled={isDisabled} error={form.formState.errors.symbol?.message} id="symbol" label="Simbol" required {...form.register("symbol")} />
          <TextInput disabled={isDisabled} error={form.formState.errors.name?.message} id="name" label="Denumire" required {...form.register("name")} />
          <Select disabled={isDisabled} error={form.formState.errors.unit?.message} id="unit" label="Unitate tarifare" options={workTypeUnitOptions} required {...form.register("unit")} />
        </FormGrid>
      </FormSection>
      <FormSection title="Preț" description="Prețul este introdus strict în unități majore și salvat în bani, fără rotunjiri ascunse.">
        <FormGrid>
          <TextInput
            disabled={isDisabled}
            error={form.formState.errors.basePriceDecimal?.message}
            hint="Maximum două zecimale. Valorile negative sunt respinse."
            id="basePriceDecimal"
            inputMode="decimal"
            label={`Preț de bază (${currency})`}
            required
            {...form.register("basePriceDecimal")}
          />
          <FormGridFull>
            <Textarea disabled={isDisabled} error={form.formState.errors.description?.message} id="description" label="Descriere" rows={4} {...form.register("description")} />
          </FormGridFull>
        </FormGrid>
      </FormSection>
    </FormLayout>
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
    <FormActions
      canReset={canReset}
      className="work-types-page__actions"
      formId={formId}
      isSubmitting={isSaving}
      onReset={onReset}
      submitLabel={submitLabel}
    />
  );
}
