import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  ConfirmActionModal,
  DateInput,
  EmptyState,
  ErrorState,
  FormActions,
  LoadingState,
  NumberInput,
  RadioGroup,
  Select,
  StatusBadge,
  Textarea,
  TextInput,
  useToast,
} from "@dental-lab/ui";
import {
  WORK_FORM_FIELD_TYPES,
  getAllowedValidationKeys,
  isOptionsFieldType,
  normalizeWorkFormFieldsOrder,
  validateWorkFormFieldCompatibility,
  type WorkFormDefaultValue,
  type WorkFormFieldDefinition,
  type WorkFormFieldType,
  type WorkFormFieldValidation,
  type WorkFormOption,
  type WorkFormTemplateStatus,
} from "@dental-lab/shared";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { fetchPermissions } from "../auth/auth-api.js";
import { hasPermission } from "../users/users-api.js";
import { getErrorMessage, UnsavedChangesPrompt, useBeforeUnloadPrompt } from "../../lib/form-utils.js";
import {
  useActivateWorkFormTemplate,
  useArchiveWorkFormTemplate,
  useCloneWorkFormTemplate,
  useCreateWorkFormTemplate,
  useReplaceWorkFormFields,
  useUpdateWorkFormTemplate,
  useWorkFormTemplate,
  useWorkFormTemplates,
} from "./work-form-templates-api.js";
import "./work-form-builder-page.css";

const activationMessage = "Aceasta versiune va deveni formularul activ pentru tipul de lucrare. Lucrarile viitoare vor utiliza aceasta versiune.";

function createEmptyField(sortOrder: number): WorkFormFieldDefinition {
  return {
    defaultValue: null,
    helpText: null,
    isActive: true,
    key: `camp_${sortOrder}`,
    label: "Camp nou",
    options: [],
    placeholder: null,
    required: false,
    sortOrder,
    type: "TEXT",
    validation: {},
  };
}

function statusLabel(status: WorkFormTemplateStatus | string): string {
  if (status === "ACTIVE") {
    return "Activ";
  }

  if (status === "ARCHIVED") {
    return "Arhivat";
  }

  return "Draft";
}

function normalizeText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cloneFields(fields: readonly WorkFormFieldDefinition[]): readonly WorkFormFieldDefinition[] {
  return fields.map((field) => ({
    ...field,
    options: field.options.map((option) => ({ ...option })),
    validation: { ...field.validation },
  }));
}

export function WorkFormBuilderPage(): ReactNode {
  const params = useParams();
  const workTypeId = params.workTypeId;
  const toast = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftFields, setDraftFields] = useState<readonly WorkFormFieldDefinition[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [confirmActivate, setConfirmActivate] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canRead = hasPermission(permissionsQuery.data, "forms.read");
  const canCreate = hasPermission(permissionsQuery.data, "forms.create");
  const canUpdate = hasPermission(permissionsQuery.data, "forms.update");
  const canArchive = hasPermission(permissionsQuery.data, "forms.archive");
  const listQuery = useWorkFormTemplates(workTypeId, Boolean(workTypeId && canRead));
  const selectedQuery = useWorkFormTemplate(selectedTemplateId, Boolean(selectedTemplateId && canRead));
  const createMutation = useCreateWorkFormTemplate();
  const updateMutation = useUpdateWorkFormTemplate();
  const replaceFieldsMutation = useReplaceWorkFormFields();
  const activateMutation = useActivateWorkFormTemplate();
  const archiveMutation = useArchiveWorkFormTemplate();
  const cloneMutation = useCloneWorkFormTemplate();
  const selectedTemplate = selectedQuery.data;
  const isSaving = createMutation.isPending || updateMutation.isPending || replaceFieldsMutation.isPending || activateMutation.isPending || archiveMutation.isPending || cloneMutation.isPending;
  const canEditSelected = Boolean(canUpdate && selectedTemplate?.status === "DRAFT" && selectedTemplate.workType.isActive);
  const canMutateWorkType = Boolean(listQuery.data?.workType.isActive);

  useEffect(() => {
    if (!selectedTemplateId && listQuery.data?.templates[0]) {
      setSelectedTemplateId(listQuery.data.templates[0].id);
    }
  }, [listQuery.data, selectedTemplateId]);

  useEffect(() => {
    if (selectedTemplate) {
      setDraftName(selectedTemplate.name);
      setDraftDescription(selectedTemplate.description ?? "");
      setDraftFields(cloneFields(selectedTemplate.fields));
      setIsDirty(false);
    }
  }, [selectedTemplate]);

  useBeforeUnloadPrompt(isDirty && !isSaving);

  const validationErrors = useMemo(() => {
    return draftFields.flatMap((field) => validateWorkFormFieldCompatibility(field).errors.map((error) => `${field.key}: ${error}`));
  }, [draftFields]);

  if (!workTypeId) {
    return <PageState><ErrorState title="Ruta invalida" description="Lipseste tipul de lucrare." /></PageState>;
  }

  if (permissionsQuery.isLoading || listQuery.isLoading) {
    return <PageState><LoadingState text="Incarc builder-ul de formular" /></PageState>;
  }

  if (!canRead) {
    return <PageState><ErrorState title="Acces refuzat" description="Contul curent nu are permisiunea forms.read." /></PageState>;
  }

  if (listQuery.isError) {
    return <PageState><ErrorState title="Formularele nu pot fi incarcate" description={getErrorMessage(listQuery.error)} /></PageState>;
  }

  function selectTemplate(templateId: string): void {
    if (isDirty && !window.confirm("Ai modificari nesalvate. Schimbi versiunea fara salvare?")) {
      return;
    }

    setSelectedTemplateId(templateId);
  }

  function mutateField(index: number, next: WorkFormFieldDefinition): void {
    setDraftFields((current) => current.map((field, currentIndex) => (currentIndex === index ? next : field)));
    setIsDirty(true);
  }

  function saveDraft(): void {
    if (!selectedTemplate || validationErrors.length > 0) {
      return;
    }

    updateMutation.mutate({
      input: { description: normalizeText(draftDescription), name: draftName },
      templateId: selectedTemplate.id,
    }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Template-ul nu a fost salvat", variant: "error" }),
      onSuccess: (template) => {
        replaceFieldsMutation.mutate({
          input: { fields: draftFields },
          templateId: template.id,
        }, {
          onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Campurile nu au fost salvate", variant: "error" }),
          onSuccess: (saved) => {
            setSelectedTemplateId(saved.id);
            setIsDirty(false);
            toast.showToast({ message: "Draftul a fost salvat.", variant: "success" });
          },
        });
      },
    });
  }

  return (
    <main className="work-form-builder-page">
      <UnsavedChangesPrompt when={isDirty && !isSaving} />
      <section className="dl-container work-form-builder-page__layout">
        <header className="work-form-builder-page__header">
          <div>
            <Link to="/work-types">Tipuri de lucrari</Link>
            <h1>{listQuery.data?.workType.code} · {listQuery.data?.workType.name}</h1>
            <p>Configureaza formularul folosit pentru lucrarile viitoare ale acestui tip.</p>
          </div>
          <div className="work-form-builder-page__header-actions">
            <StatusBadge label={listQuery.data?.workType.isActive ? "WorkType activ" : "WorkType arhivat"} variant={listQuery.data?.workType.isActive ? "registered" : "cancelled"} />
            <Button
              disabled={!canCreate || !canMutateWorkType || isSaving}
              onClick={() => createMutation.mutate({
                input: { description: null, name: "Formular draft" },
                workTypeId,
              }, {
                onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Draftul nu a fost creat", variant: "error" }),
                onSuccess: (template) => {
                  setSelectedTemplateId(template.id);
                  toast.showToast({ message: "Draftul a fost creat.", variant: "success" });
                },
              })}
            >
              Creeaza draft
            </Button>
          </div>
        </header>

        {!canUpdate ? <p className="work-form-builder-page__readonly">Ai acces de citire. Poti vedea versiunile si preview-ul, dar nu poti modifica formularul.</p> : null}
        {!canMutateWorkType ? <p className="work-form-builder-page__readonly">Tipul de lucrare este arhivat. Template-urile raman vizibile, dar managementul revine dupa reactivare.</p> : null}

        <div className="work-form-builder-page__grid">
          <Card>
            <CardHeader>
              <CardTitle>Versiuni</CardTitle>
              <CardDescription>Maximum o versiune activa per tip de lucrare.</CardDescription>
            </CardHeader>
            <CardContent>
              {listQuery.data?.templates.length === 0 ? (
                <EmptyState title="Nu exista template-uri" description="Creeaza primul draft pentru acest tip de lucrare." />
              ) : (
                <div className="work-form-builder-page__versions">
                  {listQuery.data?.templates.map((template) => (
                    <button
                      className={template.id === selectedTemplateId ? "work-form-builder-page__version work-form-builder-page__version--selected" : "work-form-builder-page__version"}
                      key={template.id}
                      onClick={() => selectTemplate(template.id)}
                      type="button"
                    >
                      <span>v{template.version} · {template.name}</span>
                      <span>{statusLabel(template.status)} · {template.fieldCount} campuri</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{selectedTemplate ? `Builder v${selectedTemplate.version}` : "Builder"}</CardTitle>
              <CardDescription>{selectedTemplate ? statusLabel(selectedTemplate.status) : "Alege sau creeaza o versiune."}</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedQuery.isLoading ? <LoadingState text="Incarc versiunea" /> : null}
              {selectedQuery.isError ? <ErrorState title="Versiunea nu poate fi incarcata" description={getErrorMessage(selectedQuery.error)} /> : null}
              {selectedTemplate ? (
                <div className="work-form-builder-page__editor">
                  <TextInput
                    disabled={!canEditSelected || isSaving}
                    label="Nume template"
                    onChange={(event) => {
                      setDraftName(event.target.value);
                      setIsDirty(true);
                    }}
                    value={draftName}
                  />
                  <Textarea
                    disabled={!canEditSelected || isSaving}
                    label="Descriere"
                    onChange={(event) => {
                      setDraftDescription(event.target.value);
                      setIsDirty(true);
                    }}
                    value={draftDescription}
                  />

                  <div className="work-form-builder-page__field-toolbar">
                    <h2>Campuri</h2>
                    <Button
                      disabled={!canEditSelected || isSaving}
                      onClick={() => {
                        setDraftFields((current) => [...current, createEmptyField(current.length + 1)]);
                        setIsDirty(true);
                      }}
                      type="button"
                      variant="outline"
                    >
                      Adauga camp
                    </Button>
                  </div>

                  {validationErrors.length > 0 ? (
                    <div className="work-form-builder-page__errors" role="alert">
                      <strong>Verifica schema:</strong>
                      <ul>{validationErrors.map((error) => <li key={error}>{error}</li>)}</ul>
                    </div>
                  ) : null}

                  {draftFields.map((field, index) => (
                    <FieldEditor
                      canEdit={canEditSelected && !isSaving}
                      field={field}
                      index={index}
                      isFirst={index === 0}
                      isLast={index === draftFields.length - 1}
                      key={`${field.key}-${index}`}
                      onChange={(next) => mutateField(index, next)}
                      onMoveDown={() => {
                        setDraftFields((current) => normalizeWorkFormFieldsOrder(current.map((entry, currentIndex) => {
                          if (currentIndex === index) {
                            return current[index + 1] ?? entry;
                          }
                          if (currentIndex === index + 1) {
                            return field;
                          }
                          return entry;
                        })));
                        setIsDirty(true);
                      }}
                      onMoveUp={() => {
                        setDraftFields((current) => normalizeWorkFormFieldsOrder(current.map((entry, currentIndex) => {
                          if (currentIndex === index) {
                            return current[index - 1] ?? entry;
                          }
                          if (currentIndex === index - 1) {
                            return field;
                          }
                          return entry;
                        })));
                        setIsDirty(true);
                      }}
                      onRemove={() => {
                        setDraftFields((current) => normalizeWorkFormFieldsOrder(current.filter((_, currentIndex) => currentIndex !== index)));
                        setIsDirty(true);
                      }}
                    />
                  ))}

                  {canEditSelected ? (
                    <FormActions
                      canReset={isDirty}
                      isSubmitting={isSaving}
                      onReset={() => {
                        setDraftName(selectedTemplate.name);
                        setDraftDescription(selectedTemplate.description ?? "");
                        setDraftFields(cloneFields(selectedTemplate.fields));
                        setIsDirty(false);
                      }}
                      submitDisabled={validationErrors.length > 0 || !isDirty}
                      submitLabel="Salveaza draft"
                      onCancel={() => undefined}
                    />
                  ) : null}

                  <div className="work-form-builder-page__actions">
                    <Button disabled={!canEditSelected || isSaving || validationErrors.length > 0 || draftFields.length === 0} onClick={saveDraft} type="button">
                      Salveaza schema
                    </Button>
                    <Button disabled={!canEditSelected || isSaving || draftFields.length === 0} onClick={() => setConfirmActivate(true)} type="button" variant="outline">
                      Activeaza
                    </Button>
                    <Button disabled={!canArchive || selectedTemplate.status !== "DRAFT" || isSaving} onClick={() => setConfirmArchive(true)} type="button" variant="outline">
                      Arhiveaza
                    </Button>
                    <Button
                      disabled={!canCreate || !canMutateWorkType || isSaving}
                      onClick={() => cloneMutation.mutate(selectedTemplate.id, {
                        onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Versiunea nu a fost clonata", variant: "error" }),
                        onSuccess: (template) => {
                          setSelectedTemplateId(template.id);
                          toast.showToast({ message: "Versiunea a fost clonata in draft.", variant: "success" });
                        },
                      })}
                      type="button"
                      variant="outline"
                    >
                      Cloneaza
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>Preview-ul nu salveaza valori si nu creeaza lucrare.</CardDescription>
            </CardHeader>
            <CardContent>
              <Preview fields={draftFields} />
            </CardContent>
          </Card>
        </div>
      </section>

      {selectedTemplate ? (
        <>
          <ConfirmActionModal
            confirmLabel="Activeaza versiunea"
            description={activationMessage}
            isLoading={activateMutation.isPending}
            isOpen={confirmActivate}
            onCancel={() => setConfirmActivate(false)}
            onConfirm={() => {
              setConfirmActivate(false);
              activateMutation.mutate(selectedTemplate.id, {
                onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Template-ul nu a fost activat", variant: "error" }),
                onSuccess: (template) => {
                  setSelectedTemplateId(template.id);
                  toast.showToast({ message: "Template-ul este activ.", variant: "success" });
                },
              });
            }}
            title="Activeaza formularul"
            variant="primary"
          />
          <ConfirmActionModal
            confirmLabel="Arhiveaza"
            description="Draftul arhivat devine read-only si ramane disponibil in istoric."
            isLoading={archiveMutation.isPending}
            isOpen={confirmArchive}
            onCancel={() => setConfirmArchive(false)}
            onConfirm={() => {
              setConfirmArchive(false);
              archiveMutation.mutate(selectedTemplate.id, {
                onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Template-ul nu a fost arhivat", variant: "error" }),
                onSuccess: (template) => {
                  setSelectedTemplateId(template.id);
                  toast.showToast({ message: "Template-ul a fost arhivat.", variant: "success" });
                },
              });
            }}
            title="Arhiveaza draftul"
          />
        </>
      ) : null}
    </main>
  );
}

function PageState({ children }: { readonly children: ReactNode }): ReactNode {
  return <main className="work-form-builder-page"><section className="dl-container work-form-builder-page__layout">{children}</section></main>;
}

function FieldEditor({
  canEdit,
  field,
  index,
  isFirst,
  isLast,
  onChange,
  onMoveDown,
  onMoveUp,
  onRemove,
}: {
  readonly canEdit: boolean;
  readonly field: WorkFormFieldDefinition;
  readonly index: number;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly onChange: (field: WorkFormFieldDefinition) => void;
  readonly onMoveDown: () => void;
  readonly onMoveUp: () => void;
  readonly onRemove: () => void;
}): ReactNode {
  const validationKeys = getAllowedValidationKeys(field.type);
  return (
    <section className="work-form-builder-page__field" aria-labelledby={`field-${index}-title`}>
      <div className="work-form-builder-page__field-header">
        <h3 id={`field-${index}-title`}>{field.sortOrder}. {field.label}</h3>
        <div>
          <Button disabled={!canEdit || isFirst} onClick={onMoveUp} type="button" variant="outline">Sus</Button>
          <Button disabled={!canEdit || isLast} onClick={onMoveDown} type="button" variant="outline">Jos</Button>
          <Button disabled={!canEdit} onClick={onRemove} type="button" variant="outline">Sterge</Button>
        </div>
      </div>
      <div className="work-form-builder-page__field-grid">
        <Select
          disabled={!canEdit}
          label="Tip"
          onChange={(event) => {
            const type = event.target.value as WorkFormFieldType;
            onChange({
              ...field,
              defaultValue: null,
              options: isOptionsFieldType(type) ? field.options : [],
              placeholder: type === "CHECKBOX" || isOptionsFieldType(type) ? null : field.placeholder,
              type,
              validation: {},
            });
          }}
          options={WORK_FORM_FIELD_TYPES.map((type) => ({ label: type, value: type }))}
          value={field.type}
        />
        <TextInput disabled={!canEdit} label="Key" onChange={(event) => onChange({ ...field, key: event.target.value.trim() })} value={field.key} />
        <TextInput disabled={!canEdit} label="Label" onChange={(event) => onChange({ ...field, label: event.target.value })} value={field.label} />
        <TextInput disabled={!canEdit || field.type === "CHECKBOX" || isOptionsFieldType(field.type)} label="Placeholder" onChange={(event) => onChange({ ...field, placeholder: normalizeText(event.target.value) })} value={field.placeholder ?? ""} />
        <Textarea disabled={!canEdit} label="Help text" onChange={(event) => onChange({ ...field, helpText: normalizeText(event.target.value) })} value={field.helpText ?? ""} />
        <Checkbox checked={field.required} disabled={!canEdit} label="Obligatoriu" onChange={(event) => onChange({ ...field, required: event.target.checked })} />
      </div>
      <ValidationEditor canEdit={canEdit} field={field} keys={validationKeys} onChange={onChange} />
      {isOptionsFieldType(field.type) ? <OptionsEditor canEdit={canEdit} field={field} onChange={onChange} /> : null}
    </section>
  );
}

function ValidationEditor({
  canEdit,
  field,
  keys,
  onChange,
}: {
  readonly canEdit: boolean;
  readonly field: WorkFormFieldDefinition;
  readonly keys: readonly (keyof WorkFormFieldValidation)[];
  readonly onChange: (field: WorkFormFieldDefinition) => void;
}): ReactNode {
  if (keys.length === 0) {
    return null;
  }

  function updateValidation(key: keyof WorkFormFieldValidation, value: string): void {
    const next: {
      max?: number;
      maxDate?: string;
      maxLength?: number;
      min?: number;
      minDate?: string;
      minLength?: number;
      step?: number;
    } = { ...field.validation };
    if (value.trim().length === 0) {
      delete next[key];
    } else if (key === "minDate" || key === "maxDate") {
      next[key] = value;
    } else if (key === "minLength") {
      next.minLength = Number(value);
    } else if (key === "maxLength") {
      next.maxLength = Number(value);
    } else if (key === "min") {
      next.min = Number(value);
    } else if (key === "max") {
      next.max = Number(value);
    } else if (key === "step") {
      next.step = Number(value);
    }
    onChange({ ...field, validation: next });
  }

  return (
    <div className="work-form-builder-page__field-grid">
      {keys.map((key) => (
        <TextInput
          disabled={!canEdit}
          key={key}
          label={key}
          onChange={(event) => updateValidation(key, event.target.value)}
          type="text"
          value={String(field.validation[key] ?? "")}
        />
      ))}
      <TextInput
        disabled={!canEdit}
        label="Default value"
        onChange={(event) => onChange({ ...field, defaultValue: toDefaultValue(field.type, event.target.value) })}
        value={defaultValueToString(field.defaultValue)}
      />
    </div>
  );
}

function OptionsEditor({
  canEdit,
  field,
  onChange,
}: {
  readonly canEdit: boolean;
  readonly field: WorkFormFieldDefinition;
  readonly onChange: (field: WorkFormFieldDefinition) => void;
}): ReactNode {
  function updateOption(index: number, next: WorkFormOption): void {
    onChange({ ...field, options: field.options.map((option, currentIndex) => (currentIndex === index ? next : option)) });
  }

  return (
    <div className="work-form-builder-page__options">
      <div className="work-form-builder-page__field-toolbar">
        <h4>Optiuni</h4>
        <Button disabled={!canEdit} onClick={() => onChange({ ...field, options: [...field.options, { label: "Optiune noua", value: `optiune_${field.options.length + 1}` }] })} type="button" variant="outline">
          Adauga optiune
        </Button>
      </div>
      {field.options.map((option, index) => (
        <div className="work-form-builder-page__option-row" key={`${option.value}-${index}`}>
          <TextInput disabled={!canEdit} label="Label" onChange={(event) => updateOption(index, { ...option, label: event.target.value })} value={option.label} />
          <TextInput disabled={!canEdit} label="Value" onChange={(event) => updateOption(index, { ...option, value: event.target.value.trim() })} value={option.value} />
          <Button disabled={!canEdit || index === 0} onClick={() => onChange({ ...field, options: swap(field.options, index, index - 1) })} type="button" variant="outline">Sus</Button>
          <Button disabled={!canEdit || index === field.options.length - 1} onClick={() => onChange({ ...field, options: swap(field.options, index, index + 1) })} type="button" variant="outline">Jos</Button>
          <Button disabled={!canEdit} onClick={() => onChange({ ...field, options: field.options.filter((_, currentIndex) => currentIndex !== index) })} type="button" variant="outline">Sterge</Button>
        </div>
      ))}
    </div>
  );
}

function Preview({ fields }: { readonly fields: readonly WorkFormFieldDefinition[] }): ReactNode {
  if (fields.length === 0) {
    return <EmptyState title="Preview gol" description="Adauga campuri in draft pentru a vedea formularul." />;
  }

  return (
    <div className="work-form-builder-page__preview">
      {fields.map((field) => {
        const label = field.required ? `${field.label} *` : field.label;
        const hint = field.helpText ?? undefined;
        if (field.type === "TEXTAREA") {
          return <Textarea disabled hint={hint} key={field.key} label={label} placeholder={field.placeholder ?? undefined} value={defaultValueToString(field.defaultValue)} />;
        }
        if (field.type === "NUMBER") {
          return <NumberInput disabled hint={hint} key={field.key} label={label} value={defaultValueToString(field.defaultValue)} />;
        }
        if (field.type === "DATE") {
          return <DateInput disabled hint={hint} key={field.key} label={label} value={defaultValueToString(field.defaultValue)} />;
        }
        if (field.type === "CHECKBOX") {
          return <Checkbox checked={field.defaultValue === true} disabled key={field.key} label={label} description={hint} />;
        }
        if (field.type === "RADIO") {
          return <RadioGroup disabled description={hint} key={field.key} label={label} options={field.options.map((option) => ({ label: option.label, value: option.value }))} value={defaultValueToString(field.defaultValue)} />;
        }
        if (isOptionsFieldType(field.type)) {
          return <Select disabled hint={hint} key={field.key} label={label} options={field.options} placeholder={field.placeholder ?? "Alege"} value={defaultValueToString(field.defaultValue)} />;
        }
        return <TextInput disabled hint={hint} key={field.key} label={label} placeholder={field.placeholder ?? undefined} value={defaultValueToString(field.defaultValue)} />;
      })}
    </div>
  );
}

function defaultValueToString(value: WorkFormDefaultValue): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (value === null) {
    return "";
  }

  return String(value);
}

function toDefaultValue(type: WorkFormFieldType, value: string): WorkFormDefaultValue {
  if (value.trim().length === 0) {
    return null;
  }

  if (type === "NUMBER") {
    return Number(value);
  }

  if (type === "CHECKBOX") {
    return value === "true";
  }

  if (type === "MULTISELECT") {
    return value.split(",").map((entry) => entry.trim()).filter(Boolean);
  }

  return value;
}

function swap<T>(items: readonly T[], from: number, to: number): readonly T[] {
  return items.map((item, index) => {
    if (index === from) {
      return items[to] ?? item;
    }
    if (index === to) {
      return items[from] ?? item;
    }
    return item;
  });
}
