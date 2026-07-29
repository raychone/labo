import {
  Button,
  DateInput,
  ErrorState,
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
import type { ClinicOption, DoctorOption, PatientOption, WorkDeadlinePreview, WorkDetail, WorkFormTemplateDetail, WorkPriority, WorkTypeFormOption } from "@dental-lab/shared";
import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { WorkFormValues } from "./works-page.schema.js";
import { WorkFormEmptyState, WorkFormFields, WorkFormLoadingState } from "./work-dynamic-form.js";
import { getFormErrorSummaryItems, useErrorSummaryFocus } from "../../lib/form-utils.js";

export const defaultWorkFormValues: WorkFormValues = {
  clinicId: "",
  clinicalNotes: null,
  doctorId: "",
  externalReference: null,
  internalNotes: null,
  patientId: "",
  patientReference: null,
  priority: "NORMAL",
  quantity: 1,
  requestedDeliveryDate: "",
  workFormValues: {},
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
  externalReference: "Referință externă",
  internalNotes: "Note interne",
  patientId: "Pacient",
  patientReference: "Identificator pacient",
  priority: "Prioritate",
  quantity: "Cantitate",
  requestedDeliveryDate: "Termen promis",
  workFormValues: "Detalii specifice lucrării",
  workTypeId: "Tip lucrare",
};

export function toWorkFormValues(work: WorkDetail | undefined): WorkFormValues {
  if (!work) {
    return defaultWorkFormValues;
  }

  const workFormValues: WorkFormValues["workFormValues"] = {};
  for (const [key, value] of Object.entries(work.workForm?.values ?? {})) {
    if (Array.isArray(value)) {
      workFormValues[key] = [...value];
    } else if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      workFormValues[key] = value;
    }
  }

  return {
    clinicId: work.clinic.id,
    clinicalNotes: work.clinicalNotes,
    doctorId: work.doctor.id,
    externalReference: work.externalReference,
    internalNotes: work.internalNotes,
    patientId: work.patient?.id ?? "",
    patientReference: work.patientReference,
    priority: work.priority,
    quantity: work.quantity,
    requestedDeliveryDate: work.requestedDeliveryDate.slice(0, 10),
    workFormValues,
    workTypeId: work.workType.id,
  };
}

export function WorkForm({
  clinicOptions,
  doctorOptions,
  form,
  formId,
  isDisabled,
  isTemplateError,
  isTemplateLoading,
  onClinicChange,
  onCreatePatient,
  onRetryTemplate,
  onSubmit,
  template,
  totalPreview,
  deadlinePreview,
  isDeadlinePreviewLoading,
  workTypeOptions,
  patientOptions,
}: {
  readonly clinicOptions: readonly ClinicOption[];
  readonly doctorOptions: readonly DoctorOption[];
  readonly form: UseFormReturn<WorkFormValues>;
  readonly formId: string;
  readonly isDisabled: boolean;
  readonly isTemplateError: boolean;
  readonly isTemplateLoading: boolean;
  readonly onClinicChange: (clinicId: string) => void;
  readonly onCreatePatient: () => void;
  readonly onRetryTemplate: () => void;
  readonly onSubmit: (values: WorkFormValues) => void;
  readonly template: WorkFormTemplateDetail | null | undefined;
  readonly totalPreview?: string | null;
  readonly deadlinePreview?: WorkDeadlinePreview | null;
  readonly isDeadlinePreviewLoading?: boolean;
  readonly workTypeOptions: readonly WorkTypeFormOption[];
  readonly patientOptions: readonly PatientOption[];
}): ReactNode {
  const summaryRef = useErrorSummaryFocus(form.formState.errors, form.formState.submitCount);
  const summaryItems = form.formState.submitCount > 0
    ? getFormErrorSummaryItems(form.formState.errors, workFieldLabels)
    : [];

  return (
    <FormLayout className="works-page__form" id={formId} onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
      <FormErrorSummary errors={summaryItems} ref={summaryRef} />

      <FormSection title="Clinică și medic" description="Alege sursa lucrării. Medicul este resetat dacă schimbi clinica.">
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
            hint={form.watch("clinicId") === "" ? "Alege mai întâi cabinetul." : doctorOptions.length === 0 ? "Nu există medici activi pentru clinica selectată." : undefined}
            id="doctorId"
            label="Medic"
            options={doctorOptions.map((doctor) => ({ label: doctor.displayName, value: doctor.id }))}
            placeholder="Alege medicul"
            required
            {...form.register("doctorId")}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Pacient" description="Alege pacientul din registru sau creează rapid un pacient nou.">
        <FormGrid>
          <Select
            disabled={isDisabled}
            error={form.formState.errors.patientId?.message}
            id="patientId"
            label="Pacient"
            options={patientOptions.map((patient) => ({ label: `${patient.fullName}${patient.birthDate ? ` · ${patient.birthDate}` : ""}`, value: patient.id }))}
            placeholder="Alege pacientul"
            required
            {...form.register("patientId")}
          />
          <div>
            <Button disabled={isDisabled} onClick={onCreatePatient} type="button" variant="secondary">Pacient nou</Button>
            <p className="works-page__muted">Fără cod pacient afișat.</p>
          </div>
        </FormGrid>
      </FormSection>

      <FormSection title="Lucrare" description="Selectează tipul și volumul. Prețul este doar preview pentru utilizatorii autorizați.">
        <FormGrid>
          <Select
            disabled={isDisabled}
            error={form.formState.errors.workTypeId?.message}
            id="workTypeId"
            label="Tip lucrare"
            options={workTypeOptions.map((workType) => ({ label: `${workType.code} · ${workType.name}`, value: workType.id }))}
            placeholder="Alege tipul lucrării"
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

      <FormSection title="Detalii specifice lucrării" description="Câmpurile vin din formularul activ al tipului de lucrare selectat.">
        {form.watch("workTypeId") === "" ? (
          <p className="works-page__muted">Alege tipul lucrării pentru a verifica formularul specific.</p>
        ) : isTemplateLoading ? (
          <WorkFormLoadingState />
        ) : isTemplateError ? (
          <div className="works-page__template-error">
            <ErrorState
              description="Nu putem determina formularul activ pentru acest tip de lucrare. Salvarea este blocată până la reîncărcare."
              title="Formularul specific nu a fost încărcat"
            />
            <Button onClick={onRetryTemplate} type="button" variant="secondary">Reîncarcă formularul</Button>
          </div>
        ) : template ? (
          <WorkFormFields fields={template.fields} form={form} isDisabled={isDisabled} />
        ) : (
          <WorkFormEmptyState />
        )}
      </FormSection>

      <FormSection title="Termen și prioritate" description="Termenul este salvat ca dată calendaristică, fără conversie de fus orar în frontend.">
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
        <DeadlinePreviewPanel isLoading={isDeadlinePreviewLoading === true} preview={deadlinePreview ?? null} />
      </FormSection>

      <FormSection title="Observații" description="Notele interne rămân vizibile doar personalului autorizat.">
        <FormGrid>
          <TextInput disabled={isDisabled} error={form.formState.errors.externalReference?.message} id="externalReference" label="Referință externă" {...form.register("externalReference")} />
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

function DeadlinePreviewPanel({ isLoading, preview }: { readonly isLoading: boolean; readonly preview: WorkDeadlinePreview | null }): ReactNode {
  if (isLoading) {
    return <p className="works-page__muted">Se calculează termenul estimat...</p>;
  }

  if (!preview) {
    return <p className="works-page__muted">Alege cabinetul, medicul, tipul lucrării și cantitatea pentru termen estimat.</p>;
  }

  if (preview.mode === "UNRESOLVED") {
    return (
      <div className="works-page__deadline-preview">
        <strong>Termen estimat nerezolvat</strong>
        <span>{preview.explanation}</span>
      </div>
    );
  }

  return (
    <div className="works-page__deadline-preview">
      <strong>{preview.mode === "MANUAL" ? "Termen manual" : "Termen estimat"}</strong>
      <span>{preview.effectiveDueAt ? new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(preview.effectiveDueAt)) : "Fără termen efectiv"}</span>
      <span>{preview.executionDays === null ? preview.explanation : `${preview.executionDays} zile lucrătoare. ${preview.explanation}`}</span>
    </div>
  );
}

export function WorkFormActions({
  canReset,
  formId,
  isSaving,
  onReset,
  submitDisabled,
  submitLabel,
}: {
  readonly canReset: boolean;
  readonly formId: string;
  readonly isSaving: boolean;
  readonly onReset: () => void;
  readonly submitDisabled?: boolean;
  readonly submitLabel: string;
}): ReactNode {
  return (
    <FormActions
      canReset={canReset}
      className="works-page__actions"
      formId={formId}
      isSubmitting={isSaving}
      onReset={onReset}
      submitDisabled={submitDisabled === true || (submitLabel === "Salvează" && !canReset)}
      submitLabel={submitLabel}
    />
  );
}
