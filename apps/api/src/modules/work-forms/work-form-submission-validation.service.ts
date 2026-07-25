import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { RequestMetadata } from "../auth/auth.types.js";
import { WORK_FORM_SUBMISSIONS_RESOURCE_TYPE, WORK_FORMS_AUDIT_ACTIONS } from "./work-forms.constants.js";

export interface SubmissionCreateInput {
  readonly templateId: string;
  readonly templateVersion: number;
  readonly values: unknown;
}

export interface PreparedSubmissionCreate {
  readonly data: Prisma.WorkFormSubmissionUncheckedCreateWithoutWorkOrderInput;
  readonly audit: {
    readonly action: string;
    readonly metadata: Prisma.InputJsonObject;
  };
}

export interface SubmissionReplaceResult {
  readonly create?: Prisma.WorkFormSubmissionUncheckedCreateWithoutWorkOrderInput;
  readonly deleteExisting: boolean;
  readonly audit: {
    readonly action: string;
    readonly metadata: Prisma.InputJsonObject;
  } | null;
}

type ActiveTemplateRecord = Prisma.WorkFormTemplateGetPayload<{
  include: {
    fields: {
      orderBy: {
        sortOrder: "asc";
      };
    };
  };
}>;

interface WorkFormClient {
  readonly workFormTemplate: {
    readonly findFirst: (args: {
      readonly include: {
        readonly fields: {
          readonly orderBy: {
            readonly sortOrder: "asc";
          };
        };
      };
      readonly where: {
        readonly status: "ACTIVE";
        readonly workTypeId: string;
      };
    }) => Promise<ActiveTemplateRecord | null>;
  };
}

type ExistingSubmissionRecord = {
  readonly schemaSnapshot: Prisma.JsonValue;
  readonly templateId: string | null;
  readonly templateNameSnapshot: string;
  readonly templateVersion: number;
  readonly values: Prisma.JsonValue;
};

const MAX_VALUES_KEYS = 100;
const MAX_VALUES_JSON_LENGTH = 25_000;
const MAX_TEXTAREA_LENGTH = 5_000;
const MAX_ARRAY_SELECTIONS = 64;
const STALE_TEMPLATE_MESSAGE = "Formularul acestui tip de lucrare a fost actualizat. Reîncarcă formularul înainte de salvare.";

type WorkFormValue = boolean | number | readonly string[] | string | null;
type WorkFormDefaultValue = WorkFormValue;
type WorkFormValues = Readonly<Record<string, WorkFormValue>>;

interface WorkFormOption {
  readonly label: string;
  readonly value: string;
}

interface WorkFormFieldValidation {
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly minDate?: string;
  readonly maxDate?: string;
}

interface WorkFormSnapshotField {
  readonly key: string;
  readonly label: string;
  readonly helpText: string | null;
  readonly type: string;
  readonly required: boolean;
  readonly sortOrder: number;
  readonly placeholder: string | null;
  readonly defaultValue: WorkFormDefaultValue;
  readonly options: readonly WorkFormOption[];
  readonly validation: WorkFormFieldValidation;
}

interface WorkFormSchemaSnapshot {
  readonly fields: readonly WorkFormSnapshotField[];
}

const FORBIDDEN_VALUE_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const FDI_TOOTH_CODES = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18",
  "21", "22", "23", "24", "25", "26", "27", "28",
  "31", "32", "33", "34", "35", "36", "37", "38",
  "41", "42", "43", "44", "45", "46", "47", "48",
  "51", "52", "53", "54", "55",
  "61", "62", "63", "64", "65",
  "71", "72", "73", "74", "75",
  "81", "82", "83", "84", "85",
]);

function isForbiddenWorkFormValueKey(key: string): boolean {
  return FORBIDDEN_VALUE_KEYS.has(key);
}

function isFdiToothCode(value: string): boolean {
  return FDI_TOOTH_CODES.has(value);
}

function isDateOnlyString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function getChangedWorkFormValueKeys(before: WorkFormValues, after: WorkFormValues): readonly string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])).sort();
}

@Injectable()
export class WorkFormSubmissionValidationService {
  public async prepareCreate(
    client: WorkFormClient,
    input: {
      readonly actorUserId: string;
      readonly submission: SubmissionCreateInput | undefined;
      readonly workCode: string;
      readonly workTypeId: string;
    },
  ): Promise<PreparedSubmissionCreate | null> {
    const template = await this.getActiveTemplate(client, input.workTypeId);
    if (!template) {
      if (input.submission !== undefined) {
        throw new BadRequestException("Acest tip de lucrare nu are un formular specific activ.");
      }

      return null;
    }

    if (!input.submission) {
      throw new BadRequestException("Detaliile specifice lucrării sunt obligatorii pentru acest tip de lucrare.");
    }

    this.ensureActiveTemplateMatches(template, input.submission.templateId, input.submission.templateVersion);
    const snapshot = this.createSnapshot(template);
    const values = this.validateValues(snapshot, input.submission.values);

    return {
      audit: {
        action: WORK_FORMS_AUDIT_ACTIONS.submissionCreated,
        metadata: {
          changedFieldKeys: Object.keys(values),
          templateId: template.id,
          templateVersion: template.version,
          workCode: input.workCode,
          workTypeId: input.workTypeId,
        },
      },
      data: {
        schemaSnapshot: snapshot as unknown as Prisma.InputJsonObject,
        submittedByUserId: input.actorUserId,
        templateId: template.id,
        templateNameSnapshot: template.name,
        templateVersion: template.version,
        updatedByUserId: input.actorUserId,
        values: values as unknown as Prisma.InputJsonObject,
      },
    };
  }

  public prepareUpdateValues(
    existingSubmission: ExistingSubmissionRecord | null,
    valuesInput: unknown,
    input: {
      readonly actorUserId: string;
      readonly workCode: string;
      readonly workId: string;
    },
  ): {
    readonly data: Prisma.WorkFormSubmissionUncheckedUpdateWithoutWorkOrderInput;
    readonly audit: {
      readonly action: string;
      readonly metadata: Prisma.InputJsonObject;
    } | null;
  } {
    if (!existingSubmission) {
      throw new BadRequestException("Această lucrare nu are un formular specific salvat.");
    }

    const snapshot = this.parseSnapshot(existingSubmission.schemaSnapshot);
    const previousValues = this.parseValues(existingSubmission.values);
    const values = this.validateValues(snapshot, valuesInput);
    const changedFieldKeys = getChangedWorkFormValueKeys(previousValues, values);

    return {
      audit: changedFieldKeys.length > 0
        ? {
            action: WORK_FORMS_AUDIT_ACTIONS.submissionUpdated,
            metadata: {
              changedFieldKeys,
              templateId: existingSubmission.templateId,
              templateVersion: existingSubmission.templateVersion,
              workCode: input.workCode,
              workId: input.workId,
            },
          }
        : null,
      data: {
        updatedByUserId: input.actorUserId,
        values: values as unknown as Prisma.InputJsonObject,
      },
    };
  }

  public async prepareReplaceForWorkTypeChange(
    client: WorkFormClient,
    input: {
      readonly actorUserId: string;
      readonly existingSubmission: ExistingSubmissionRecord | null;
      readonly newSubmission: SubmissionCreateInput | undefined;
      readonly nextWorkTypeId: string;
      readonly oldWorkTypeId: string;
      readonly workCode: string;
      readonly workId: string;
    },
  ): Promise<SubmissionReplaceResult> {
    const template = await this.getActiveTemplate(client, input.nextWorkTypeId);
    const oldTemplateId = input.existingSubmission?.templateId ?? null;
    const oldTemplateVersion = input.existingSubmission?.templateVersion ?? null;

    if (!template) {
      if (input.newSubmission !== undefined) {
        throw new BadRequestException("Noul tip de lucrare nu are un formular specific activ.");
      }

      return {
        audit: input.existingSubmission
          ? {
              action: WORK_FORMS_AUDIT_ACTIONS.submissionReplaced,
              metadata: {
                newTemplateId: null,
                newTemplateVersion: null,
                oldTemplateId,
                oldTemplateVersion,
                workCode: input.workCode,
                workId: input.workId,
              },
            }
          : null,
        deleteExisting: input.existingSubmission !== null,
      };
    }

    if (!input.newSubmission) {
      throw new BadRequestException("Detaliile specifice lucrării sunt obligatorii pentru noul tip de lucrare.");
    }

    this.ensureActiveTemplateMatches(template, input.newSubmission.templateId, input.newSubmission.templateVersion);
    const snapshot = this.createSnapshot(template);
    const values = this.validateValues(snapshot, input.newSubmission.values);

    return {
      audit: {
        action: WORK_FORMS_AUDIT_ACTIONS.submissionReplaced,
        metadata: {
          changedFieldKeys: Object.keys(values),
          newTemplateId: template.id,
          newTemplateVersion: template.version,
          oldTemplateId,
          oldTemplateVersion,
          workCode: input.workCode,
          workId: input.workId,
        },
      },
      create: {
        schemaSnapshot: snapshot as unknown as Prisma.InputJsonObject,
        submittedByUserId: input.actorUserId,
        templateId: template.id,
        templateNameSnapshot: template.name,
        templateVersion: template.version,
        updatedByUserId: input.actorUserId,
        values: values as unknown as Prisma.InputJsonObject,
      },
      deleteExisting: input.existingSubmission !== null,
    };
  }

  public async recordSubmissionAudit(
    client: Pick<Prisma.TransactionClient, "auditLog">,
    input: {
      readonly action: string;
      readonly actorUserId: string;
      readonly metadata: Prisma.InputJsonObject;
      readonly requestMetadata: RequestMetadata;
      readonly resourceId: string;
    },
  ): Promise<void> {
    await client.auditLog.create({
      data: {
        action: input.action,
        actorUserId: input.actorUserId,
        metadata: {
          ...input.metadata,
          actorUserId: input.actorUserId,
        },
        resourceId: input.resourceId,
        resourceType: WORK_FORM_SUBMISSIONS_RESOURCE_TYPE,
        ...(input.requestMetadata.ipAddress ? { ipAddress: input.requestMetadata.ipAddress } : {}),
        ...(input.requestMetadata.userAgent ? { userAgent: input.requestMetadata.userAgent } : {}),
      },
    });
  }

  private async getActiveTemplate(client: WorkFormClient, workTypeId: string): Promise<ActiveTemplateRecord | null> {
    return client.workFormTemplate.findFirst({
      include: {
        fields: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
      where: {
        status: "ACTIVE",
        workTypeId,
      },
    });
  }

  private ensureActiveTemplateMatches(template: ActiveTemplateRecord, templateId: string, templateVersion: number): void {
    if (template.id !== templateId || template.version !== templateVersion) {
      throw new ConflictException(STALE_TEMPLATE_MESSAGE);
    }
  }

  private createSnapshot(template: ActiveTemplateRecord): WorkFormSchemaSnapshot {
    return {
      fields: template.fields
        .filter((field) => field.isActive)
        .map((field) => ({
          defaultValue: this.toDefaultValue(field.defaultValue),
          helpText: field.helpText,
          key: field.key,
          label: field.label,
          options: this.toOptions(field.options),
          placeholder: field.placeholder,
          required: field.required,
          sortOrder: field.sortOrder,
          type: field.type,
          validation: this.toValidation(field.validation),
        })),
    };
  }

  private validateValues(snapshot: WorkFormSchemaSnapshot, input: unknown): WorkFormValues {
    this.ensurePayloadSize(input);
    if (!this.isPlainObject(input)) {
      throw new BadRequestException("Valorile formularului trebuie trimise ca obiect simplu.");
    }

    const source = input as Readonly<Record<string, unknown>>;
    const fieldsByKey = new Map(snapshot.fields.map((field) => [field.key, field]));
    const keys = Object.keys(source);
    if (keys.length > MAX_VALUES_KEYS) {
      throw new BadRequestException(`Formularul poate conține maximum ${MAX_VALUES_KEYS} valori.`);
    }

    for (const key of keys) {
      if (isForbiddenWorkFormValueKey(key) || !fieldsByKey.has(key)) {
        throw new BadRequestException(`Câmp formular necunoscut sau interzis: ${key}.`);
      }
    }

    const normalized: Record<string, WorkFormValue> = {};
    for (const field of snapshot.fields) {
      const rawValue = Object.prototype.hasOwnProperty.call(source, field.key) ? source[field.key] : field.defaultValue;
      normalized[field.key] = this.normalizeFieldValue(field, rawValue);
    }

    return normalized;
  }

  private normalizeFieldValue(field: WorkFormSnapshotField, value: unknown): WorkFormValue {
    if (value === undefined || value === null || value === "") {
      if (field.required) {
        throw new BadRequestException(`${field.label} este obligatoriu.`);
      }
      return field.type === "CHECKBOX" ? false : null;
    }

    if (field.type === "CHECKBOX") {
      if (typeof value !== "boolean") {
        throw new BadRequestException(`${field.label} trebuie să fie Da/Nu.`);
      }
      if (field.required && value !== true) {
        throw new BadRequestException(`${field.label} trebuie bifat.`);
      }
      return value;
    }

    if (field.type === "NUMBER") {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new BadRequestException(`${field.label} trebuie să fie număr.`);
      }
      this.validateNumber(field, value);
      return value;
    }

    if (field.type === "MULTISELECT" || field.type === "TOOTH") {
      if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
        throw new BadRequestException(`${field.label} trebuie să fie o listă de valori.`);
      }
      const unique = [...new Set(value.map((item) => item.trim()).filter((item) => item.length > 0))];
      if (field.required && unique.length === 0) {
        throw new BadRequestException(`${field.label} este obligatoriu.`);
      }
      if (unique.length > MAX_ARRAY_SELECTIONS) {
        throw new BadRequestException(`${field.label} conține prea multe selecții.`);
      }
      this.validateArrayAllowlist(field, unique);
      return unique;
    }

    if (typeof value !== "string") {
      throw new BadRequestException(`${field.label} trebuie să fie text.`);
    }

    const text = value.trim();
    if (field.required && text.length === 0) {
      throw new BadRequestException(`${field.label} este obligatoriu.`);
    }
    if (text.length === 0) {
      return null;
    }
    if (this.hasUnsafeText(text) || this.looksLikeBase64Payload(text)) {
      throw new BadRequestException(`${field.label} conține text nepermis.`);
    }

    this.validateText(field, text);
    this.validateStringAllowlist(field, text);
    return text;
  }

  private validateText(field: WorkFormSnapshotField, value: string): void {
    const maxLength = field.type === "TEXTAREA" ? Math.min(field.validation.maxLength ?? MAX_TEXTAREA_LENGTH, MAX_TEXTAREA_LENGTH) : field.validation.maxLength;
    if (typeof field.validation.minLength === "number" && value.length < field.validation.minLength) {
      throw new BadRequestException(`${field.label} trebuie să aibă minimum ${field.validation.minLength} caractere.`);
    }
    if (typeof maxLength === "number" && value.length > maxLength) {
      throw new BadRequestException(`${field.label} trebuie să aibă maximum ${maxLength} caractere.`);
    }
    if (field.type === "DATE" && !isDateOnlyString(value)) {
      throw new BadRequestException(`${field.label} trebuie să fie dată YYYY-MM-DD.`);
    }
    if (field.type === "DATE" && typeof field.validation.minDate === "string" && value < field.validation.minDate) {
      throw new BadRequestException(`${field.label} este înainte de data minimă.`);
    }
    if (field.type === "DATE" && typeof field.validation.maxDate === "string" && value > field.validation.maxDate) {
      throw new BadRequestException(`${field.label} este după data maximă.`);
    }
  }

  private validateNumber(field: WorkFormSnapshotField, value: number): void {
    if (typeof field.validation.min === "number" && value < field.validation.min) {
      throw new BadRequestException(`${field.label} este sub limita minimă.`);
    }
    if (typeof field.validation.max === "number" && value > field.validation.max) {
      throw new BadRequestException(`${field.label} depășește limita maximă.`);
    }
    if (typeof field.validation.step === "number" && field.validation.step > 0) {
      const base = typeof field.validation.min === "number" ? field.validation.min : 0;
      const quotient = (value - base) / field.validation.step;
      if (Math.abs(quotient - Math.round(quotient)) > Number.EPSILON * 100) {
        throw new BadRequestException(`${field.label} nu respectă pasul configurat.`);
      }
    }
  }

  private validateStringAllowlist(field: WorkFormSnapshotField, value: string): void {
    if (field.type !== "RADIO" && field.type !== "SELECT" && field.type !== "SHADE") {
      return;
    }
    const allowed = new Set(field.options.map((option) => option.value));
    if (!allowed.has(value)) {
      throw new BadRequestException(`${field.label} conține o opțiune invalidă.`);
    }
  }

  private validateArrayAllowlist(field: WorkFormSnapshotField, values: readonly string[]): void {
    if (field.type === "TOOTH") {
      for (const value of values) {
        if (!isFdiToothCode(value)) {
          throw new BadRequestException(`${field.label} conține un dinte FDI invalid.`);
        }
      }
      return;
    }

    const allowed = new Set(field.options.map((option) => option.value));
    for (const value of values) {
      if (!allowed.has(value)) {
        throw new BadRequestException(`${field.label} conține o opțiune invalidă.`);
      }
    }
  }

  private parseSnapshot(value: Prisma.JsonValue): WorkFormSchemaSnapshot {
    if (!this.isPlainObject(value)) {
      throw new BadRequestException("Snapshot-ul formularului este invalid.");
    }
    const fields = (value as { readonly fields?: unknown }).fields;
    if (!Array.isArray(fields)) {
      throw new BadRequestException("Snapshot-ul formularului este invalid.");
    }

    return { fields: fields as WorkFormSnapshotField[] };
  }

  private parseValues(value: Prisma.JsonValue): WorkFormValues {
    return this.isPlainObject(value) ? value as WorkFormValues : {};
  }

  private ensurePayloadSize(value: unknown): void {
    if (JSON.stringify(value).length > MAX_VALUES_JSON_LENGTH) {
      throw new BadRequestException(`Payload-ul formularului poate avea maximum ${MAX_VALUES_JSON_LENGTH} caractere.`);
    }
  }

  private toOptions(value: Prisma.JsonValue | null): readonly WorkFormOption[] {
    return Array.isArray(value)
      ? value
          .flatMap((option) => {
            if (!this.isPlainObject(option) || typeof option.value !== "string" || typeof option.label !== "string") {
              return [];
            }

            return [{ label: option.label, value: option.value }];
          })
          .slice(0, 100)
      : [];
  }

  private toValidation(value: Prisma.JsonValue | null): WorkFormFieldValidation {
    if (!this.isPlainObject(value)) {
      return {};
    }

    const source = value as Record<string, unknown>;
    const validation: Record<string, number | string> = {};
    if (typeof source.max === "number") validation.max = source.max;
    if (typeof source.maxDate === "string") validation.maxDate = source.maxDate;
    if (typeof source.maxLength === "number") validation.maxLength = source.maxLength;
    if (typeof source.min === "number") validation.min = source.min;
    if (typeof source.minDate === "string") validation.minDate = source.minDate;
    if (typeof source.minLength === "number") validation.minLength = source.minLength;
    if (typeof source.step === "number") validation.step = source.step;

    return validation;
  }

  private toDefaultValue(value: Prisma.JsonValue | null): WorkFormDefaultValue {
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      return value;
    }
    return null;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
  }

  private hasUnsafeText(value: string): boolean {
    const lower = value.toLowerCase();
    return /[<>]/.test(value) || lower.includes("script") || lower.includes("javascript:");
  }

  private looksLikeBase64Payload(value: string): boolean {
    return value.length > 1024 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);
  }
}
