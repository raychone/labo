import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

import { MAX_BASE_PRICE_MINOR, SORT_DIRECTIONS, WORK_TYPE_SORT_FIELDS, WORK_TYPE_UNITS } from "../work-types.constants.js";

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

export class ListWorkTypesQueryDto {
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
  @IsIn(WORK_TYPE_SORT_FIELDS)
  public readonly sortBy: (typeof WORK_TYPE_SORT_FIELDS)[number] = "createdAt";

  @IsOptional()
  @IsIn(SORT_DIRECTIONS)
  public readonly sortDirection: (typeof SORT_DIRECTIONS)[number] = "desc";
}

export class WorkTypeMutationDto {
  @IsOptional()
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  public readonly name?: string;

  @IsOptional()
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  public readonly symbol?: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(1000)
  public readonly description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_BASE_PRICE_MINOR)
  public readonly basePriceMinor?: number;

  @IsOptional()
  @IsIn(WORK_TYPE_UNITS)
  public readonly unit?: (typeof WORK_TYPE_UNITS)[number];
}

export class CreateWorkTypeDto extends WorkTypeMutationDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  public declare readonly name: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  public declare readonly symbol: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_BASE_PRICE_MINOR)
  public declare readonly basePriceMinor: number;

  @IsIn(WORK_TYPE_UNITS)
  public override readonly unit: (typeof WORK_TYPE_UNITS)[number] = "UNIT";
}

export class CreateOperationalWorkTypeDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  public readonly name!: string;
}

export class UpdateWorkTypeDto extends WorkTypeMutationDto {}
