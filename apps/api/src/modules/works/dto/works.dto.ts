import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsISO8601, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";

import { MAX_WORK_ORDER_QUANTITY, SORT_DIRECTIONS, WORK_CLAIM_STATUSES, WORK_CYCLE_REASONS, WORK_ORDER_SORT_FIELDS, WORK_PRIORITIES, WORK_STATUSES } from "../works.constants.js";
import { DEADLINE_FILTERS } from "../work-deadline-visual.js";

function trimOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return value as string;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function trimRequiredString(value: unknown): string {
  return typeof value === "string" ? value.trim() : value as string;
}

export class ListWorksQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  public readonly pageSize: number = 20;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(120)
  public readonly search?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly clinicId?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly doctorId?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly workTypeId?: string | null;

  @IsOptional()
  @IsIn(WORK_STATUSES)
  public readonly status?: (typeof WORK_STATUSES)[number];

  @IsOptional()
  @IsIn(WORK_PRIORITIES)
  public readonly priority?: (typeof WORK_PRIORITIES)[number];

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly dateFrom?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly dateTo?: string;

  @IsOptional()
  @IsIn(DEADLINE_FILTERS)
  public readonly deadlineFilter?: (typeof DEADLINE_FILTERS)[number];

  @IsOptional()
  @IsIn(WORK_CLAIM_STATUSES)
  public readonly claimStatus?: (typeof WORK_CLAIM_STATUSES)[number];

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly executionLegalEntityCode?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly assignedTechnicianId?: string | null;

  @IsOptional()
  @IsIn(WORK_ORDER_SORT_FIELDS)
  public readonly sortBy: (typeof WORK_ORDER_SORT_FIELDS)[number] = "createdAt";

  @IsOptional()
  @IsIn(SORT_DIRECTIONS)
  public readonly sortDirection: (typeof SORT_DIRECTIONS)[number] = "desc";
}

export class ListClaimWorksQueryDto extends ListWorksQueryDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === "true")
  public readonly onlyActive?: boolean;
}

export class ClaimWorkDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsIn(["NC", "NG"])
  public readonly executionLegalEntityCode!: "NC" | "NG";

  @Type(() => Number)
  @IsInt()
  @Min(0)
  public readonly expectedClaimRevision!: number;
}

export class ReleaseWorkDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public readonly expectedClaimRevision!: number;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  public readonly reason!: string;
}

export class ReassignWorkDto extends ClaimWorkDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public readonly technicianId!: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  public readonly reason!: string;
}

export class CreateNextWorkCycleDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public readonly clinicId!: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public readonly doctorId!: string;

  @IsIn(WORK_CYCLE_REASONS.filter((reason) => reason !== "INITIAL"))
  public readonly reason!: Exclude<(typeof WORK_CYCLE_REASONS)[number], "INITIAL">;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  public readonly notes?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  public readonly reasonNotes?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public readonly expectedActiveCycleId?: string;
}

export class WorkMutationDto {
  @IsOptional()
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public readonly clinicId?: string;

  @IsOptional()
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public readonly doctorId?: string;

  @IsOptional()
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public readonly workTypeId?: string;

  @IsOptional()
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public readonly patientId?: string;

  @IsOptional()
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  public readonly patientName?: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(80)
  public readonly patientReference?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_WORK_ORDER_QUANTITY)
  public readonly quantity?: number;

  @IsOptional()
  @IsIn(WORK_PRIORITIES)
  public readonly priority?: (typeof WORK_PRIORITIES)[number];

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly requestedDeliveryDate?: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(120)
  public readonly externalReference?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(2000)
  public readonly internalNotes?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(2000)
  public readonly clinicalNotes?: string | null;
}

export class WorkFormSubmissionDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public readonly templateId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly templateVersion!: number;

  @IsObject()
  public readonly values!: Record<string, unknown>;
}

export class CreateWorkDto extends WorkMutationDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public declare readonly clinicId: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public declare readonly doctorId: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public declare readonly workTypeId: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public declare readonly patientId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_WORK_ORDER_QUANTITY)
  public override readonly quantity: number = 1;

  @IsIn(WORK_PRIORITIES)
  public override readonly priority: (typeof WORK_PRIORITIES)[number] = "NORMAL";

  @IsISO8601({ strict: true })
  public declare readonly requestedDeliveryDate: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/)
  public readonly manualDueAt?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkFormSubmissionDto)
  public readonly workFormSubmission?: WorkFormSubmissionDto;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly expectedWorkflowTemplateId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly expectedWorkflowTemplateVersion?: number;
}

export class UpdateWorkDto extends WorkMutationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public readonly expectedDeadlineRevision?: number;

  @IsOptional()
  @IsBoolean()
  public readonly confirmWorkTypeChange?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkFormSubmissionDto)
  public readonly workFormSubmission?: WorkFormSubmissionDto;

  @IsOptional()
  @IsObject()
  public readonly workFormValues?: Record<string, unknown>;
}

export class WorkDeadlinePreviewDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public readonly clinicId!: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public readonly doctorId!: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public readonly workTypeId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_WORK_ORDER_QUANTITY)
  public readonly quantity!: number;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/)
  public readonly startAt?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/)
  public readonly manualDueAt?: string | null;
}

export class RecalculateWorkDeadlineDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public readonly expectedRevision!: number;

  @IsOptional()
  @IsBoolean()
  public readonly includeStartDay?: boolean;
}

export class SetManualWorkDeadlineDto {
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/)
  public readonly dueAt!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  public readonly expectedRevision!: number;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(500)
  public readonly reason?: string | null;
}
