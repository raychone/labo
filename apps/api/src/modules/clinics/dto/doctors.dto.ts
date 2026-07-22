import { Transform, Type } from "class-transformer";
import { IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from "class-validator";

import { DOCTOR_SORT_FIELDS, SORT_DIRECTIONS } from "../clinics.constants.js";

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

function lowercaseOptionalString(value: unknown): string | null | undefined {
  const trimmed = trimOptionalString(value);
  return typeof trimmed === "string" ? trimmed.toLowerCase() : trimmed;
}

export class ListDoctorsQueryDto {
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
  @IsString()
  @MaxLength(80)
  public readonly clinicId?: string;

  @IsOptional()
  @IsIn(DOCTOR_SORT_FIELDS)
  public readonly sortBy: (typeof DOCTOR_SORT_FIELDS)[number] = "createdAt";

  @IsOptional()
  @IsIn(SORT_DIRECTIONS)
  public readonly sortDirection: (typeof SORT_DIRECTIONS)[number] = "desc";
}

export class ListDoctorOptionsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  public readonly clinicId?: string;
}

export class DoctorMutationDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  public readonly clinicId?: string;

  @IsOptional()
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  public readonly firstName?: string;

  @IsOptional()
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  public readonly lastName?: string;

  @IsOptional()
  @Transform(({ value }) => lowercaseOptionalString(value))
  @IsEmail()
  @MaxLength(254)
  public readonly email?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @Matches(/^[+()0-9 .-]{6,40}$/)
  public readonly phone?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(80)
  public readonly professionalCode?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(2000)
  public readonly internalNotes?: string | null;
}

export class CreateDoctorDto extends DoctorMutationDto {
  @IsString()
  @MaxLength(80)
  public declare readonly clinicId: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  public declare readonly firstName: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  public declare readonly lastName: string;
}

export class UpdateDoctorDto extends DoctorMutationDto {}
