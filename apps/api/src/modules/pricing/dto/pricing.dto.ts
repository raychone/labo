import { Transform, Type } from "class-transformer";
import { IsArray, IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";

import { WORK_TYPE_UNITS } from "../../work-types/work-types.constants.js";
import {
  MAX_PERCENTAGE_BASIS_POINTS,
  MAX_PRICE_MINOR,
  PRICING_ADJUSTMENT_TYPES,
  PRICING_AGREEMENT_SORT_FIELDS,
  PRICING_AGREEMENT_SUBJECT_TYPES,
  PRICING_RULE_SCOPES,
  PRICING_SORT_FIELDS,
} from "../pricing.constants.js";

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
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length === 0 ? null : trimmed;
}

function trimRequiredString(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value as string;
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }
  if (value === true || value === "true") {
    return true;
  }
  if (value === false || value === "false") {
    return false;
  }
  return undefined;
}

export class PricingCatalogQueryDto {
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
  @MaxLength(100)
  public readonly category?: string | null;

  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean()
  public readonly active?: boolean;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly workTypeId?: string | null;

  @IsOptional()
  @IsIn(PRICING_SORT_FIELDS)
  public readonly sortBy: (typeof PRICING_SORT_FIELDS)[number] = "sortOrder";

  @IsOptional()
  @IsIn(["asc", "desc"])
  public readonly sortDirection: "asc" | "desc" = "asc";
}

export class PriceCatalogItemDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  public readonly displayName!: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  public readonly category!: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public readonly workTypeId!: string;

  @IsIn(WORK_TYPE_UNITS)
  public readonly unit!: (typeof WORK_TYPE_UNITS)[number];

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_MINOR)
  public readonly standardPriceMinor!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  public readonly sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  public readonly isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(1000)
  public readonly notes?: string | null;
}

export class ExecutionTimeRuleDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly minQuantity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly maxQuantity?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly executionDays?: number | null;

  @IsBoolean()
  public readonly requiresManualDueDate!: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  public readonly priority?: number;

  @IsOptional()
  @IsBoolean()
  public readonly isActive?: boolean;
}

export class ReplaceExecutionRulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExecutionTimeRuleDto)
  public readonly rules!: readonly ExecutionTimeRuleDto[];
}

export class PricingAgreementsQueryDto {
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
  @IsIn(PRICING_AGREEMENT_SUBJECT_TYPES)
  public readonly subjectType?: (typeof PRICING_AGREEMENT_SUBJECT_TYPES)[number];

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly clinicId?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly doctorId?: string | null;

  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean()
  public readonly active?: boolean;

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly date?: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(120)
  public readonly search?: string | null;

  @IsOptional()
  @IsIn(PRICING_AGREEMENT_SORT_FIELDS)
  public readonly sortBy: (typeof PRICING_AGREEMENT_SORT_FIELDS)[number] = "updatedAt";

  @IsOptional()
  @IsIn(["asc", "desc"])
  public readonly sortDirection: "asc" | "desc" = "desc";
}

export class PricingAgreementDto {
  @IsIn(PRICING_AGREEMENT_SUBJECT_TYPES)
  public readonly subjectType!: (typeof PRICING_AGREEMENT_SUBJECT_TYPES)[number];

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly clinicId?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly doctorId?: string | null;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  public readonly name!: string;

  @IsISO8601({ strict: true })
  public readonly validFrom!: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly validUntil?: string | null;

  @IsOptional()
  @IsBoolean()
  public readonly isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(1000)
  public readonly notes?: string | null;
}

export class PricingAgreementRuleDto {
  @IsIn(PRICING_RULE_SCOPES)
  public readonly scope!: (typeof PRICING_RULE_SCOPES)[number];

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly priceCatalogItemId?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(100)
  public readonly category?: string | null;

  @IsIn(PRICING_ADJUSTMENT_TYPES)
  public readonly adjustmentType!: (typeof PRICING_ADJUSTMENT_TYPES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_MINOR)
  public readonly adjustmentValueMinor?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_PERCENTAGE_BASIS_POINTS)
  public readonly adjustmentPercentageBasisPoints?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_MINOR)
  public readonly overridePriceMinor?: number | null;
}

export class ReplacePricingAgreementRulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingAgreementRuleDto)
  public readonly rules!: readonly PricingAgreementRuleDto[];
}

export class ResolvePreviewDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public readonly workTypeId!: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public readonly clinicId!: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public readonly doctorId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly quantity!: number;

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly evaluationDate?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/)
  public readonly startAt?: string;

  @IsOptional()
  @IsBoolean()
  public readonly includeStartDay?: boolean;
}
