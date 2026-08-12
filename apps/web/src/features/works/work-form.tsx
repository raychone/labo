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
import { useEffect, useId, useMemo, useState } from "react";

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
  const [patientSearch, setPatientSearch] = useState("");
  const [workTypeSearch, setWorkTypeSearch] = useState("");
  const patientId = form.watch("patientId");
  const workTypeId = form.watch("workTypeId");
  const selectedPatient = useMemo(() => patientOptions.find((patient) => patient.id === patientId) ?? null, [patientId, patientOptions]);
  const selectedWorkType = useMemo(() => workTypeOptions.find((workType) => workType.id === workTypeId) ?? null, [workTypeId, workTypeOptions]);

  useEffect(() => {
    if (patientId !== "" && selectedPatient) {
      setPatientSearch(selectedPatient.fullName);
    }
  }, [patientId, selectedPatient]);

  useEffect(() => {
    if (workTypeId !== "" && selectedWorkType) {
      setWorkTypeSearch(`${selectedWorkType.code} · ${selectedWorkType.name}`);
    }
  }, [selectedWorkType, workTypeId]);

  const visiblePatientOptions = useMemo(() => filterSearchableOptions(patientOptions.map((patient) => ({
    label: patient.fullName,
    secondary: patient.birthDate ? formatSearchableDate(patient.birthDate) : undefined,
    value: patient.id,
  })), patientSearch), [patientOptions, patientSearch]);
  const visibleWorkTypeOptions = useMemo(() => filterSearchableOptions(workTypeOptions.map((workType) => ({
    label: `${workType.code} · ${workType.name}`,
    secondary: formatWorkTypeUnit(workType.unit),
    value: workType.id,
  })), workTypeSearch), [workTypeOptions, workTypeSearch]);

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
            value={form.watch("doctorId")}
            {...form.register("doctorId")}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Pacient" description="Alege pacientul din registru sau creează rapid un pacient nou.">
        <FormGrid>
          <SearchablePickerField
            disabled={isDisabled}
            error={form.formState.errors.patientId?.message}
            id="patientId"
            label="Pacient"
            onSelect={(value) => form.setValue("patientId", value, { shouldDirty: true, shouldValidate: true })}
            onSearchChange={setPatientSearch}
            options={visiblePatientOptions}
            placeholder="Caută pacientul"
            required
            searchValue={patientSearch}
            selectedValue={patientId}
            emptyMessage="Nu există pacienți potriviți."
          />
          <div>
            <Button disabled={isDisabled} onClick={onCreatePatient} type="button" variant="secondary">Pacient nou</Button>
            <p className="works-page__muted">Fără cod pacient afișat.</p>
          </div>
        </FormGrid>
      </FormSection>

      <FormSection title="Lucrare" description="Selectează tipul și volumul. Prețul este doar preview pentru utilizatorii autorizați.">
        <FormGrid>
          <SearchablePickerField
            disabled={isDisabled}
            error={form.formState.errors.workTypeId?.message}
            id="workTypeId"
            label="Tip lucrare"
            onSelect={(value) => form.setValue("workTypeId", value, { shouldDirty: true, shouldValidate: true })}
            onSearchChange={setWorkTypeSearch}
            options={visibleWorkTypeOptions}
            placeholder="Caută tipul lucrării"
            required
            searchValue={workTypeSearch}
            selectedValue={workTypeId}
            emptyMessage="Nu există tipuri de lucrări potrivite."
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

function formatWorkTypeUnit(unit: WorkTypeFormOption["unit"]): string {
  return unit === "ELEMENT"
    ? "Element"
    : unit === "UNIT"
      ? "Bucată"
      : unit === "ARCH"
        ? "Arcadă"
        : unit === "CASE"
          ? "Lucrare"
          : unit === "REPAIR"
            ? "Reparație"
            : "Altă unitate";
}

function formatSearchableDate(value: string): string {
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(value));
}

function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function filterSearchableOptions(options: readonly SearchableOption[], searchValue: string): readonly SearchableOption[] {
  const normalizedSearch = normalizeSearchText(searchValue.trim());
  const matched = normalizedSearch === ""
    ? options
    : options.filter((option) => normalizeSearchText(`${option.label} ${option.secondary ?? ""}`).includes(normalizedSearch));

  return normalizedSearch === "" ? matched.slice(0, 3) : matched;
}

interface SearchableOption {
  readonly label: string;
  readonly secondary: string | undefined;
  readonly value: string;
}

function SearchablePickerField({
  disabled,
  emptyMessage,
  error,
  id,
  label,
  onSearchChange,
  onSelect,
  options,
  placeholder,
  required,
  searchValue,
  selectedValue,
}: {
  readonly disabled: boolean;
  readonly emptyMessage: string;
  readonly error: string | undefined;
  readonly id: string;
  readonly label: string;
  readonly onSearchChange: (value: string) => void;
  readonly onSelect: (value: string) => void;
  readonly options: readonly SearchableOption[];
  readonly placeholder: string;
  readonly required: boolean;
  readonly searchValue: string;
  readonly selectedValue: string;
}): ReactNode {
  const [isOpen, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const listboxId = `${controlId}-listbox`;

  const selectedOption = options.find((option) => option.value === selectedValue);
  const hint = selectedOption
    ? `Selectat: ${selectedOption.label}`
    : "Apasă și tastează pentru căutare. Lista începe cu 3 variante.";

  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(0);
      return;
    }

    if (options.length === 0) {
      setHighlightedIndex(-1);
      return;
    }

    setHighlightedIndex((current) => {
      if (current < 0) {
        return 0;
      }
      return Math.min(current, options.length - 1);
    });
  }, [isOpen, options.length]);

  function selectOption(option: SearchableOption): void {
    onSelect(option.value);
    onSearchChange(option.label);
    setOpen(false);
    setHighlightedIndex(0);
  }

  return (
    <div className="works-page__search-field">
      <TextInput
        aria-activedescendant={isOpen && highlightedIndex >= 0 && options[highlightedIndex] ? `${controlId}-option-${highlightedIndex}` : undefined}
        aria-controls={isOpen ? listboxId : undefined}
        aria-expanded={isOpen}
        autoComplete="off"
        disabled={disabled}
        error={error}
        hint={hint}
        id={controlId}
        label={label}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        onChange={(event) => {
          onSearchChange(event.target.value);
          if (selectedValue !== "") {
            onSelect("");
          }
          setOpen(true);
          setHighlightedIndex(0);
        }}
        onKeyDown={(event) => {
          if (disabled) {
            return;
          }

          if (event.key === "ArrowDown") {
            if (!isOpen) {
              setOpen(true);
            }
            event.preventDefault();
            setHighlightedIndex((current) => options.length === 0 ? -1 : Math.min(current + 1, options.length - 1));
            return;
          }

          if (event.key === "ArrowUp") {
            if (!isOpen) {
              setOpen(true);
            }
            event.preventDefault();
            setHighlightedIndex((current) => options.length === 0 ? -1 : Math.max(current - 1, 0));
            return;
          }

          if (event.key === "Enter" && isOpen && highlightedIndex >= 0) {
            const option = options[highlightedIndex];
            if (option) {
              event.preventDefault();
              selectOption(option);
            }
            return;
          }

          if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          }
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        required={required}
        role="combobox"
        type="search"
        value={searchValue}
      />
      {isOpen ? (
        <div className="works-page__search-listbox" id={listboxId} role="listbox">
          {options.length > 0 ? options.map((option, index) => (
            <button
              aria-selected={option.value === selectedValue}
              className={index === highlightedIndex ? "works-page__search-option works-page__search-option--active" : "works-page__search-option"}
              id={`${controlId}-option-${index}`}
              key={option.value}
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption(option)}
              role="option"
              type="button"
            >
              <strong>{option.label}</strong>
              {option.secondary ? <span>{option.secondary}</span> : null}
            </button>
          )) : <div className="works-page__search-empty">{emptyMessage}</div>}
        </div>
      ) : null}
    </div>
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
