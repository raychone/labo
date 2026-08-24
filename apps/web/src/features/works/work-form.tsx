import {
  Button,
  DateInput,
  FormActions,
  FormErrorSummary,
  FormGrid,
  FormGridFull,
  FormLayout,
  FormSection,
  NumberInput,
  RadioGroup,
  Select,
  TextInput,
  Textarea,
} from "@dental-lab/ui";
import { URGENCY_LABELS_RO, URGENCY_LEVELS } from "@dental-lab/shared";
import type { ClinicOption, CreateWorkInput, DoctorOption, PatientOption, ProbeTypeView, UpdateWorkInput, WorkDeadlinePreview, WorkDeadlinePreviewInput, WorkDetail, WorkFormTemplateDetail, WorkTypeFormOption } from "@dental-lab/shared";
import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useEffect, useId, useMemo, useState } from "react";

import { IMPLANT_PLATFORM_OPTIONS, RESTORATION_TYPE_OPTIONS, WORK_SHADE_OPTIONS, type WorkFormValues } from "./works-page.schema.js";
import { getFormErrorSummaryItems, useErrorSummaryFocus } from "../../lib/form-utils.js";

export const defaultWorkFormValues: WorkFormValues = {
  clinicId: "",
  clinicalNotes: null,
  doctorId: "",
  externalReference: null,
  internalNotes: null,
  implantPlatform: null,
  implantPlatformCustom: null,
  patientId: "",
  patientReference: null,
  probeTypeId: "",
  priority: "NORMAL",
  urgency: "NORMAL",
  quantity: 1,
  requestedDeliveryDate: "",
  requestedDeliveryTime: "",
  restorationType: null,
  shade: null,
  workFormValues: {},
  workTypeId: "",
};

const workFieldLabels: Record<keyof WorkFormValues, string> = {
  clinicId: "Cabinet",
  clinicalNotes: "Note clinice",
  doctorId: "Medic",
  externalReference: "Referință externă",
  internalNotes: "Note interne",
  implantPlatform: "Platformă implant",
  implantPlatformCustom: "Alt tip platformă",
  patientId: "Pacient",
  patientReference: "Identificator pacient",
  probeTypeId: "Tip probă curentă",
  priority: "Prioritate",
  urgency: "Urgență",
  quantity: "Elemente",
  requestedDeliveryDate: "Data termenului",
  requestedDeliveryTime: "Ora termenului",
  restorationType: "Tip restaurare",
  shade: "Culoare",
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

  const restorationValue = workFormValues.restoration_type;

  return {
    clinicId: work.clinic?.id ?? "",
    clinicalNotes: work.clinicalNotes,
    doctorId: work.doctor?.id ?? "",
    externalReference: work.externalReference,
    internalNotes: work.internalNotes,
    implantPlatform: work.implantPlatform && IMPLANT_PLATFORM_OPTIONS.includes(work.implantPlatform as (typeof IMPLANT_PLATFORM_OPTIONS)[number]) ? work.implantPlatform : work.implantPlatform ? "Alt tip" : null,
    implantPlatformCustom: work.implantPlatform && !IMPLANT_PLATFORM_OPTIONS.includes(work.implantPlatform as (typeof IMPLANT_PLATFORM_OPTIONS)[number]) ? work.implantPlatform : null,
    patientId: work.patient?.id ?? "",
    patientReference: work.patientReference,
    probeTypeId: work.activeProbeCycle?.probeType.id ?? "",
    priority: work.priority,
    urgency: work.urgency ?? "NORMAL",
    quantity: work.quantity,
    requestedDeliveryDate: work.requestedDeliveryDate.slice(0, 10),
    requestedDeliveryTime: work.deadline.manualDueAt?.slice(11, 16) ?? work.deadline.effectiveDueAt?.slice(11, 16) ?? "",
    restorationType: restorationValue === "cimentata" || restorationValue === "insurubata" ? restorationValue : null,
    shade: work.shade,
    workFormValues,
    workTypeId: work.workType.id,
  };
}

export function toWorkMutationInput(values: WorkFormValues, template: WorkFormTemplateDetail | null | undefined, includeManualDueAt?: boolean, includePatient?: true): CreateWorkInput;
export function toWorkMutationInput(values: WorkFormValues, template: WorkFormTemplateDetail | null | undefined, includeManualDueAt: boolean, includePatient: false): UpdateWorkInput;
export function toWorkMutationInput(values: WorkFormValues, template: WorkFormTemplateDetail | null | undefined, includeManualDueAt = true, includePatient = true): CreateWorkInput | UpdateWorkInput {
  const dynamicValues = toPersistedWorkFormValues(values, template);
  return {
    clinicId: values.clinicId === "" ? null : values.clinicId,
    clinicalNotes: values.clinicalNotes,
    doctorId: values.doctorId === "" ? null : values.doctorId,
    externalReference: values.externalReference,
    internalNotes: values.internalNotes,
    ...(includePatient ? { patientId: values.patientId } : {}),
    patientReference: values.patientReference,
    priority: values.priority,
    urgency: values.urgency,
    ...(includePatient ? { probeTypeId: values.probeTypeId } : {}),
    ...(includePatient ? { probeDeadlineAt: toManualDueAt(values.requestedDeliveryDate, values.requestedDeliveryTime) ?? "" } : {}),
    quantity: values.quantity,
    requestedDeliveryDate: values.requestedDeliveryDate,
    ...(includeManualDueAt ? { manualDueAt: toManualDueAt(values.requestedDeliveryDate, values.requestedDeliveryTime) } : {}),
    shade: values.shade,
    implantPlatform: values.implantPlatform === "Alt tip" ? values.implantPlatformCustom : values.implantPlatform,
    ...(template
      ? {
          workFormSubmission: {
            templateId: template.id,
            templateVersion: template.version,
            values: dynamicValues,
          },
        }
      : {}),
    workTypeId: values.workTypeId,
  };
}

export function toPersistedWorkFormValues(values: WorkFormValues, template?: { readonly fields: readonly { readonly key: string }[] } | null): WorkFormValues["workFormValues"] {
  const workFormValues = { ...values.workFormValues };
  if (template?.fields.some((field) => field.key === "restoration_type")) {
    if (values.restorationType) {
      workFormValues.restoration_type = values.restorationType;
    } else {
      delete workFormValues.restoration_type;
    }
  } else {
    delete workFormValues.restoration_type;
  }
  if (template?.fields.some((field) => field.key === "shade")) {
    if (values.shade) {
      workFormValues.shade = values.shade;
    } else {
      delete workFormValues.shade;
    }
  }
  return workFormValues;
}

export function toWorkDeadlinePreviewInput(values: Pick<WorkFormValues, "clinicId" | "doctorId" | "quantity" | "requestedDeliveryDate" | "requestedDeliveryTime" | "workTypeId">): WorkDeadlinePreviewInput | null {
  if (values.workTypeId === "" || !Number.isFinite(values.quantity) || values.quantity < 1) {
    return null;
  }
  return {
    clinicId: values.clinicId === "" ? null : values.clinicId,
    doctorId: values.doctorId === "" ? null : values.doctorId,
    manualDueAt: toManualDueAt(values.requestedDeliveryDate, values.requestedDeliveryTime),
    quantity: values.quantity,
    workTypeId: values.workTypeId,
  };
}

export function validateDynamicWorkForm(form: UseFormReturn<WorkFormValues>, template: WorkFormTemplateDetail | null | undefined): boolean {
  if (!template) {
    return true;
  }

  let isValid = true;
  for (const field of template.fields) {
    const value = form.getValues(`workFormValues.${field.key}`);
    if (field.required && !hasMeaningfulDynamicValue(value)) {
      form.setError(`workFormValues.${field.key}`, { message: `${field.label} este obligatoriu.` });
      isValid = false;
    }
    if ((field.type === "SELECT" || field.type === "RADIO" || field.type === "SHADE") && hasMeaningfulDynamicValue(value)) {
      const allowed = new Set(field.options.map((option) => option.value));
      if (typeof value !== "string" || !allowed.has(value)) {
        form.setError(`workFormValues.${field.key}`, { message: "Alege o opțiune validă." });
        isValid = false;
      }
    }
  }

  return isValid;
}

function toManualDueAt(date: string, time: string): string | null {
  if (date === "" || time === "") {
    return null;
  }

  const value = new Date(`${date}T${time}:00`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function hasMeaningfulDynamicValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0);
}

export function WorkForm({
  clinicOptions,
  doctorOptions,
  form,
  formId,
  isDisabled,
  onClinicChange,
  onCreateClinic,
  onCreateDoctor,
  onCreatePatient,
  onSubmit,
  allowPatientEdit = true,
  workDetailsSlot,
  multiItem = false,
  workTypeOptions,
  patientOptions,
  probeTypeOptions,
}: {
  readonly clinicOptions: readonly ClinicOption[];
  readonly doctorOptions: readonly DoctorOption[];
  readonly form: UseFormReturn<WorkFormValues>;
  readonly formId: string;
  readonly isDisabled: boolean;
  readonly onClinicChange: (clinicId: string) => void;
  readonly onCreateClinic?: () => void;
  readonly onCreateDoctor?: () => void;
  readonly onCreatePatient: () => void;
  readonly onSubmit: (values: WorkFormValues) => void;
  readonly allowPatientEdit?: boolean;
  readonly workDetailsSlot?: ReactNode;
  readonly multiItem?: boolean;
  readonly totalPreview?: string | null;
  readonly deadlinePreview?: WorkDeadlinePreview | null;
  readonly isDeadlinePreviewLoading?: boolean;
  readonly workTypeOptions: readonly WorkTypeFormOption[];
  readonly patientOptions: readonly PatientOption[];
  readonly probeTypeOptions?: readonly ProbeTypeView[];
}): ReactNode {
  const summaryRef = useErrorSummaryFocus(form.formState.errors, form.formState.submitCount);
  const summaryItems = form.formState.submitCount > 0
    ? getFormErrorSummaryItems(form.formState.errors, workFieldLabels)
    : [];
  const [patientSearch, setPatientSearch] = useState("");
  const [clinicSearch, setClinicSearch] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [workTypeSearch, setWorkTypeSearch] = useState("");
  const patientId = form.watch("patientId");
  const clinicId = form.watch("clinicId");
  const doctorId = form.watch("doctorId");
  const workTypeId = form.watch("workTypeId");
  const implantPlatform = form.watch("implantPlatform");
  const selectedPatient = useMemo(() => patientOptions.find((patient) => patient.id === patientId) ?? null, [patientId, patientOptions]);
  const selectedWorkType = useMemo(() => workTypeOptions.find((workType) => workType.id === workTypeId) ?? null, [workTypeId, workTypeOptions]);
  const selectedClinic = useMemo(() => clinicOptions.find((clinic) => clinic.id === clinicId) ?? null, [clinicId, clinicOptions]);
  const selectedDoctor = useMemo(() => doctorOptions.find((doctor) => doctor.id === doctorId) ?? null, [doctorId, doctorOptions]);

  useEffect(() => {
    if (patientId !== "" && selectedPatient) {
      setPatientSearch(selectedPatient.fullName);
    }
  }, [patientId, selectedPatient]);

  useEffect(() => {
    if (workTypeId !== "" && selectedWorkType) {
      setWorkTypeSearch(selectedWorkType.name);
    }
  }, [selectedWorkType, workTypeId]);

  useEffect(() => {
    if (clinicId !== "" && selectedClinic) {
      setClinicSearch(`${selectedClinic.code} · ${selectedClinic.name}`);
    }
  }, [clinicId, selectedClinic]);

  useEffect(() => {
    if (doctorId !== "" && selectedDoctor) {
      setDoctorSearch(selectedDoctor.displayName);
    }
  }, [doctorId, selectedDoctor]);

  const visibleClinicOptions = useMemo(() => filterSearchableOptions(clinicOptions.map((clinic) => ({
    label: `${clinic.code} · ${clinic.name}`,
    secondary: undefined,
    value: clinic.id,
  })), clinicSearch), [clinicOptions, clinicSearch]);
  const visibleDoctorOptions = useMemo(() => filterSearchableOptions(doctorOptions.map((doctor) => ({
    label: doctor.displayName,
    secondary: undefined,
    value: doctor.id,
  })), doctorSearch), [doctorOptions, doctorSearch]);
  const visiblePatientOptions = useMemo(() => filterSearchableOptions(patientOptions.map((patient) => ({
    label: patient.fullName,
    secondary: patient.birthDate ? formatSearchableDate(patient.birthDate) : undefined,
    value: patient.id,
  })), patientSearch), [patientOptions, patientSearch]);
  const visibleWorkTypeOptions = useMemo(() => filterSearchableOptions(workTypeOptions.map((workType) => ({
    label: workType.name,
    secondary: `${workType.symbol} · ${formatWorkTypeUnit(workType.unit)}`,
    value: workType.id,
  })), workTypeSearch), [workTypeOptions, workTypeSearch]);

  return (
    <FormLayout className="works-page__form" id={formId} onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
      <FormErrorSummary errors={summaryItems} ref={summaryRef} />

      <FormSection title="Clinică și medic">
        <FormGrid>
          <SearchablePickerField
            disabled={isDisabled || !allowPatientEdit}
            error={form.formState.errors.clinicId?.message}
            id="clinicId"
            label="Clinică"
            onSelect={(value) => {
              form.setValue("clinicId", value, { shouldDirty: true, shouldValidate: true });
              form.setValue("doctorId", "", { shouldDirty: true, shouldValidate: true });
              onClinicChange(value);
              setDoctorSearch("");
            }}
            onSearchChange={(value) => {
              setClinicSearch(value);
              if (value === "") {
                form.setValue("clinicId", "", { shouldDirty: true, shouldValidate: true });
              }
            }}
            options={visibleClinicOptions}
            placeholder="Caută clinica"
            required={false}
            searchValue={clinicSearch}
            selectedValue={clinicId}
            emptyMessage="Nu există clinici potrivite."
          />
          {onCreateClinic ? <div><Button disabled={isDisabled} onClick={onCreateClinic} type="button" variant="secondary">Clinică nouă</Button></div> : null}
          <SearchablePickerField
            disabled={isDisabled}
            error={form.formState.errors.doctorId?.message}
            id="doctorId"
            label="Medic"
            onSelect={(value) => form.setValue("doctorId", value, { shouldDirty: true, shouldValidate: true })}
            onSearchChange={(value) => {
              setDoctorSearch(value);
              if (value === "") {
                form.setValue("doctorId", "", { shouldDirty: true, shouldValidate: true });
              }
            }}
            options={visibleDoctorOptions}
            placeholder="Caută medicul"
            required={false}
            searchValue={doctorSearch}
            selectedValue={doctorId}
            emptyMessage={doctorOptions.length === 0 ? "Nu există medici activi disponibili." : "Nu există medici potriviți."}
          />
          {onCreateDoctor ? <div><Button disabled={isDisabled} onClick={onCreateDoctor} type="button" variant="secondary">Medic nou</Button></div> : null}
        </FormGrid>
      </FormSection>

      <FormSection title="Pacient">
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
          {allowPatientEdit ? <div>
            <Button disabled={isDisabled} onClick={onCreatePatient} type="button" variant="secondary">Pacient nou</Button>
          </div> : null}
        </FormGrid>
      </FormSection>

      <FormSection title="Lucrare">
        {multiItem ? <FormGrid className="works-page__multi-item-details-grid">{workDetailsSlot}</FormGrid> : <FormGrid>
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
            label="Elemente"
            min={1}
            required
            {...form.register("quantity", { valueAsNumber: true })}
          />
          <SearchablePickerField
            disabled={isDisabled}
            error={form.formState.errors.shade?.message}
            id="shade"
            label="Culoare"
            onSelect={(value) => form.setValue("shade", value, { shouldDirty: true, shouldValidate: true })}
            onSearchChange={(value) => {
              if (value === "") {
                form.setValue("shade", null, { shouldDirty: true, shouldValidate: true });
              }
            }}
            options={WORK_SHADE_OPTIONS.map((value) => ({ label: value, secondary: undefined, value }))}
            placeholder="Caută culoarea"
            required={false}
            searchValue={form.watch("shade") ?? ""}
            selectedValue={form.watch("shade") ?? ""}
            emptyMessage="Nu există culori potrivite."
          />
          <SearchablePickerField
            disabled={isDisabled}
            error={form.formState.errors.implantPlatform?.message}
            id="implantPlatform"
            label="Platformă implant"
            onSelect={(value) => form.setValue("implantPlatform", value, { shouldDirty: true, shouldValidate: true })}
            onSearchChange={(value) => {
              if (value === "") {
                form.setValue("implantPlatform", null, { shouldDirty: true, shouldValidate: true });
              }
            }}
            options={IMPLANT_PLATFORM_OPTIONS.map((value) => ({ label: value, secondary: undefined, value }))}
            placeholder="Caută platforma"
            required={false}
            searchValue={implantPlatform ?? ""}
            selectedValue={implantPlatform ?? ""}
            emptyMessage="Nu există platforme potrivite."
          />
          {implantPlatform === "Alt tip" ? <TextInput disabled={isDisabled} error={form.formState.errors.implantPlatformCustom?.message} id="implantPlatformCustom" label="Alt tip platformă" placeholder="Introdu tipul platformei" {...form.register("implantPlatformCustom")} /> : null}
          <RadioGroup
            disabled={isDisabled}
            label="Tip restaurare"
            name="restorationType"
            onValueChange={(value) => {
              if (value === "cimentata" || value === "insurubata") {
                form.setValue("restorationType", value, { shouldDirty: true, shouldValidate: true });
              }
            }}
            options={RESTORATION_TYPE_OPTIONS}
            value={form.watch("restorationType") ?? ""}
          />
          {form.watch("restorationType") ? (
            <Button
              disabled={isDisabled}
              onClick={() => form.setValue("restorationType", null, { shouldDirty: true, shouldValidate: true })}
              type="button"
              variant="outline"
            >
              Fără tip restaurare
            </Button>
          ) : null}
          {workDetailsSlot}
        </FormGrid>}
      </FormSection>

      <FormSection title="Termen și urgență">
        <FormGrid>
          <Select disabled={isDisabled} error={form.formState.errors.probeTypeId?.message} id="probeTypeId" label="Tip probă curentă" options={(probeTypeOptions ?? []).map((option) => ({ label: option.name, value: option.id }))} required {...form.register("probeTypeId")} />
          <DateInput
            disabled={isDisabled}
            error={form.formState.errors.requestedDeliveryDate?.message}
            id="requestedDeliveryDate"
            label="Data termenului"
            required
            {...form.register("requestedDeliveryDate")}
          />
          <TextInput
            disabled={isDisabled}
            error={form.formState.errors.requestedDeliveryTime?.message}
            id="requestedDeliveryTime"
            label="Ora termenului"
            placeholder="HH:mm"
            {...form.register("requestedDeliveryTime")}
          />
          <Select disabled={isDisabled} error={form.formState.errors.urgency?.message} id="urgency" label="Urgență" options={URGENCY_LEVELS.map((value) => ({ label: `${URGENCY_LABELS_RO[value]} · +${value === "NORMAL" ? 0 : value === "URGENCY_1" ? 25 : value === "URGENCY_2" ? 50 : value === "URGENCY_3" ? 75 : 100}%`, value }))} {...form.register("urgency")} />
        </FormGrid>
      </FormSection>

      <FormSection title="Observații">
        <FormGrid>
          <FormGridFull>
            <Textarea disabled={isDisabled} error={form.formState.errors.clinicalNotes?.message} id="clinicalNotes" label="Note" rows={4} {...form.register("clinicalNotes")} />
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

export interface SearchableOption {
  readonly label: string;
  readonly secondary: string | undefined;
  readonly value: string;
}

export function SearchablePickerField({
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

  const hint = undefined;

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
          const nextValue = event.target.value;
          onSearchChange(nextValue);
          if (selectedValue !== "") {
            onSelect("");
          }
          const exactOption = options.find((option) => option.value === nextValue.trim() || normalizeSearchText(option.label) === normalizeSearchText(nextValue.trim()));
          if (exactOption) {
            selectOption(exactOption);
            return;
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
