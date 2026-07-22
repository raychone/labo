import { Button, DateInput, NumberInput, Select, TextInput, Textarea } from "@dental-lab/ui";
import type { ClinicOption, DoctorOption, WorkDetail, WorkPriority, WorkTypeFormOption } from "@dental-lab/shared";
import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { WorkFormValues } from "./works-page.schema.js";

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
  workTypeOptions,
}: {
  readonly clinicOptions: readonly ClinicOption[];
  readonly doctorOptions: readonly DoctorOption[];
  readonly form: UseFormReturn<WorkFormValues>;
  readonly formId: string;
  readonly isDisabled: boolean;
  readonly onClinicChange: (clinicId: string) => void;
  readonly onSubmit: (values: WorkFormValues) => void;
  readonly workTypeOptions: readonly WorkTypeFormOption[];
}): ReactNode {
  return (
    <form className="works-page__form" id={formId} onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
      <fieldset className="works-page__fieldset">
        <legend>Receptie</legend>
        <div className="works-page__form-grid">
          <Select
            disabled={isDisabled}
            error={form.formState.errors.clinicId?.message}
            label="Cabinet"
            options={clinicOptions.map((clinic) => ({ label: `${clinic.code} · ${clinic.name}`, value: clinic.id }))}
            placeholder="Alege cabinetul"
            value={form.watch("clinicId")}
            {...form.register("clinicId", {
              onChange: (event) => onClinicChange((event.target as HTMLSelectElement).value),
            })}
          />
          <Select
            disabled={isDisabled || form.watch("clinicId") === ""}
            error={form.formState.errors.doctorId?.message}
            label="Medic"
            options={doctorOptions.map((doctor) => ({ label: doctor.displayName, value: doctor.id }))}
            placeholder="Alege medicul"
            {...form.register("doctorId")}
          />
          <Select
            disabled={isDisabled}
            error={form.formState.errors.workTypeId?.message}
            label="Tip lucrare"
            options={workTypeOptions.map((workType) => ({ label: `${workType.code} · ${workType.name}`, value: workType.id }))}
            placeholder="Alege tipul lucrarii"
            {...form.register("workTypeId")}
          />
          <DateInput
            disabled={isDisabled}
            error={form.formState.errors.requestedDeliveryDate?.message}
            label="Termen promis"
            {...form.register("requestedDeliveryDate")}
          />
        </div>
      </fieldset>

      <fieldset className="works-page__fieldset">
        <legend>Pacient si volum</legend>
        <div className="works-page__form-grid">
          <TextInput disabled={isDisabled} error={form.formState.errors.patientName?.message} label="Pacient" {...form.register("patientName")} />
          <TextInput
            disabled={isDisabled}
            error={form.formState.errors.patientReference?.message}
            label="Identificator pacient"
            {...form.register("patientReference")}
          />
          <NumberInput disabled={isDisabled} error={form.formState.errors.quantity?.message} label="Cantitate" {...form.register("quantity", { valueAsNumber: true })} />
          <Select disabled={isDisabled} error={form.formState.errors.priority?.message} label="Prioritate" options={priorityOptions} {...form.register("priority")} />
        </div>
      </fieldset>

      <fieldset className="works-page__fieldset">
        <legend>Note</legend>
        <div className="works-page__form-grid">
          <TextInput disabled={isDisabled} error={form.formState.errors.externalReference?.message} label="Referinta externa" {...form.register("externalReference")} />
          <Textarea disabled={isDisabled} error={form.formState.errors.clinicalNotes?.message} label="Note clinice" rows={4} {...form.register("clinicalNotes")} />
          <Textarea disabled={isDisabled} error={form.formState.errors.internalNotes?.message} label="Note interne" rows={4} {...form.register("internalNotes")} />
        </div>
      </fieldset>
    </form>
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
    <div className="works-page__actions">
      <Button disabled={isSaving} form={formId} isLoading={isSaving} type="submit">
        {submitLabel}
      </Button>
      <Button disabled={!canReset || isSaving} onClick={onReset} variant="outline">
        Revino
      </Button>
    </div>
  );
}
