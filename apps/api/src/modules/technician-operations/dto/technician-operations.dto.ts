import { Transform, Type } from "class-transformer";
import { IsArray, IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from "class-validator";

import { SORT_DIRECTIONS } from "../../work-types/work-types.constants.js";
import { MAX_TECHNICIAN_RATE_MINOR } from "../technician-operations.constants.js";

export const TECHNICIAN_OPERATION_SORT_FIELDS = ["code", "createdAt", "name", "updatedAt"] as const;

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

export class ListTechnicianOperationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly pageSize: number = 20;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public readonly search?: string;

  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean()
  public readonly isActive?: boolean;

  @IsOptional()
  @IsIn(TECHNICIAN_OPERATION_SORT_FIELDS)
  public readonly sortBy: (typeof TECHNICIAN_OPERATION_SORT_FIELDS)[number] = "createdAt";

  @IsOptional()
  @IsIn(SORT_DIRECTIONS)
  public readonly sortDirection: (typeof SORT_DIRECTIONS)[number] = "desc";
}

export class TechnicianOperationMutationDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  public readonly code!: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  public readonly name!: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  public readonly category!: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(1000)
  public readonly description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public readonly sortOrder?: number;

}

export class SetTechnicianRateDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(1)
  public readonly technicianId!: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(1)
  public readonly operationId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_TECHNICIAN_RATE_MINOR)
  public readonly rateMinor!: number;

  @IsOptional()
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  public readonly currency?: string = "RON";

  @IsOptional()
  @IsISO8601()
  public readonly effectiveFrom?: string;
}

export class ListTechnicianRatesQueryDto {
  @IsOptional()
  @IsString()
  public readonly technicianId?: string;

  @IsOptional()
  @IsString()
  public readonly operationId?: string;

  @IsOptional()
  @IsISO8601()
  public readonly asOf?: string;
}

export class ResolveTechnicianRateQueryDto {
  @IsString()
  public readonly technicianId!: string;

  @IsString()
  public readonly operationId!: string;

  @IsOptional()
  @IsISO8601()
  public readonly asOf?: string;
}

export class ListPerformedTechnicianOperationsQueryDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(1)
  public readonly workOrderId!: string;
}

export class TechnicianEarningsQueryDto {
  @IsOptional()
  @IsIn(["DAY", "MONTH", "YEAR"])
  public readonly period: "DAY" | "MONTH" | "YEAR" = "DAY";

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  public readonly date?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  public readonly month?: string;

  @IsOptional()
  @IsString()
  public readonly technicianId?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  public readonly includeRemoved?: boolean;
}

export class CreateTechnicianPaymentDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(1)
  public readonly technicianId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly amountMinor!: number;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(500)
  public readonly notes?: string | null;

  @IsOptional()
  @IsISO8601()
  public readonly paidAt?: string;

  @IsOptional()
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  public readonly currency?: string = "RON";
}

export class PerformTechnicianOperationDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(1)
  public readonly workOrderId!: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(1)
  public readonly operationId!: string;

  @IsArray()
  @IsInt({ each: true })
  public readonly selectedTeeth!: readonly number[];

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(1000)
  public readonly notes?: string | null;
}

export class RemovePerformedTechnicianOperationDto {
  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(500)
  public readonly reason?: string | null;
}
