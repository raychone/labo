import {
  DateInput,
  FormActions,
  FormErrorSummary,
  FormGrid,
  FormGridFull,
  FormLayout,
  FormSection,
  NumberInput,
  Select,
  TextInput,
  Textarea,
} from "@dental-lab/ui";
import type { ClinicOption, DoctorOption, WorkDetail, WorkPriority, WorkTypeFormOption } from "@dental-lab/shared";
import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { WorkFormValues } from "./works-page.schema.js";
import { getFormErrorSummaryItems, useErrorSummaryFocus } from "../../lib/form-utils.js";

export const defaultWorkFormValues: WorkFormValues = {
  clinicId: "",
  clinicalNotes: null,
  doctorId: "",
  externalReference: null,
  internalNotes: null,
  patientName: "",
  patientReference: null,
  priority: "NORMAL",
  quantity: 1,
  requestedDeliveryDate: "",
  workTypeId: "",
};

const priorityOptions: readonly { readonly label: string; readonly value: WorkPriority }[] = [
  { label: "Normal", value: "NORMAL" },
  { label: "Urgent", value: "URGENT" },
];

const workFieldLabels: Record<keyof WorkFormValues, string> = {
  clinicId: "Cabinet",
  clinicalNotes: "Note clinice",
  doctorId: "Medic",
  externalReference: "Referinta externa",
  internalNotes: "Note interne",
  patientName: "Pacient",
  patientReference: "Identificator pacient",
  priority: "Prioritate",
  quantity: "Cantitate",
  requestedDeliveryDate: "Termen promis",
  workTypeId: "Tip lucrare",
};

export function toWorkFormValues(work: WorkDetail | undefined): WorkFormValues {
  if (!work) {
    return defaultWorkFormValues;
  }

  return {
    clinicId: work.clinic.id,
    clinicalNotes: work.clinicalNotes,
    doctorId: work.doctor.id,
    externalReference: work.externalReference,
    internalNotes: work.internalNotes,
    patientName: work.patientName,
    patientReference: work.patientReference,
    priority: work.priority,
    quantity: work.quantity,
    requestedDeliveryDate: work.requestedDeliveryDate.slice(0, 10),
    workTypeId: work.workType.id,
  };
}

export function WorkForm({
  clinicOptions,
  doctorOptions,
  form,
  formId,
  isDisabled,
  onClinicChange,
  onSubmit,
  totalPreview,
  workTypeOptions,
}: {
  readonly clinicOptions: readonly ClinicOption[];
  readonly doctorOptions: readonly DoctorOption[];
  readonly form: UseFormReturn<WorkFormValues>;
  readonly formId: string;
  readonly isDisabled: boolean;
  readonly onClinicChange: (clinicId: string) => void;
  readonly onSubmit: (values: WorkFormValues) => void;
  readonly totalPreview?: string | null;
  readonly workTypeOptions: readonly WorkTypeFormOption[];
}): ReactNode {
  const summaryRef = useErrorSummaryFocus(form.formState.errors, form.formState.submitCount);
  const summaryItems = form.formState.submitCount > 0
    ? getFormErrorSummaryItems(form.formState.errors, workFieldLabels)
    : [];

  return (
    <FormLayout className="works-page__form" id={formId} onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
      <FormErrorSummary errors={summaryItems} ref={summaryRef} />

      <FormSection title="Clinica si medic" description="Alege sursa lucrarii. Medicul este resetat daca schimbi clinica.">
        <FormGrid>
          <Select
            disabled={isDisabled}
            error={form.formState.errors.clinicId?.message}
            id="clinicId"
            label="Cabinet"
            options={clinicOptions.map((clinic) => ({ label: `${clinic.code} · ${clinic.name}`, value: clinic.id }))}
            placeholder="Alege cabinetul"
            required
            value={form.watch("clinicId")}
            {...form.register("clinicId", {
              onChange: (event) => onClinicChange((event.target as HTMLSelectElement).value),
            })}
          />
          <Select
            disabled={isDisabled || form.watch("clinicId") === ""}
            error={form.formState.errors.doctorId?.message}
            hint={form.watch("clinicId") === "" ? "Alege mai intai cabinetul." : doctorOptions.length === 0 ? "Nu exista medici activi pentru clinica selectata." : undefined}
            id="doctorId"
            label="Medic"
            options={doctorOptions.map((doctor) => ({ label: doctor.displayName, value: doctor.id }))}
            placeholder="Alege medicul"
            required
            {...form.register("doctorId")}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Pacient" description="Foloseste identificatorul minim necesar pentru receptie.">
        <FormGrid>
          <TextInput disabled={isDisabled} error={form.formState.errors.patientName?.message} id="patientName" label="Pacient" required {...form.register("patientName")} />
          <TextInput
            disabled={isDisabled}
            error={form.formState.errors.patientReference?.message}
            id="patientReference"
            label="Identificator pacient"
            {...form.register("patientReference")}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Lucrare" description="Selecteaza tipul si volumul. Pretul este doar preview pentru utilizatorii autorizati.">
        <FormGrid>
          <Select
            disabled={isDisabled}
            error={form.formState.errors.workTypeId?.message}
            id="workTypeId"
            label="Tip lucrare"
            options={workTypeOptions.map((workType) => ({ label: `${workType.code} · ${workType.name}`, value: workType.id }))}
            placeholder="Alege tipul lucrarii"
            required
            {...form.register("workTypeId")}
          />
          <NumberInput
            disabled={isDisabled}
            error={form.formState.errors.quantity?.message}
            id="quantity"
            label="Cantitate"
            min={1}
            required
            {...form.register("quantity", { valueAsNumber: true })}
          />
          {totalPreview ? <p className="works-page__price-preview">Preview total: <strong>{totalPreview}</strong></p> : null}
        </FormGrid>
      </FormSection>

      <FormSection title="Termen si prioritate" description="Termenul este salvat ca data calendaristica, fara conversie de fus orar in frontend.">
        <FormGrid>
          <DateInput
            disabled={isDisabled}
            error={form.formState.errors.requestedDeliveryDate?.message}
            id="requestedDeliveryDate"
            label="Termen promis"
            required
            {...form.register("requestedDeliveryDate")}
          />
          <Select disabled={isDisabled} error={form.formState.errors.priority?.message} id="priority" label="Prioritate" options={priorityOptions} required {...form.register("priority")} />
        </FormGrid>
      </FormSection>

      <FormSection title="Observatii" description="Notele interne raman vizibile doar personalului autorizat.">
        <FormGrid>
          <TextInput disabled={isDisabled} error={form.formState.errors.externalReference?.message} id="externalReference" label="Referinta externa" {...form.register("externalReference")} />
          <FormGridFull>
            <Textarea disabled={isDisabled} error={form.formState.errors.clinicalNotes?.message} id="clinicalNotes" label="Note clinice" rows={4} {...form.register("clinicalNotes")} />
          </FormGridFull>
          <FormGridFull>
            <Textarea disabled={isDisabled} error={form.formState.errors.internalNotes?.message} id="internalNotes" label="Note interne" rows={4} {...form.register("internalNotes")} />
          </FormGridFull>
        </FormGrid>
      </FormSection>
    </FormLayout>
  );
}

export function WorkFormActions({
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
      className="works-page__actions"
      formId={formId}
      isSubmitting={isSaving}
      onReset={onReset}
      submitDisabled={submitLabel === "Salveaza" && !canReset}
      submitLabel={submitLabel}
    />
  );
}
