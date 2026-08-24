import { Transform, Type } from "class-transformer";
import { IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength, ValidateBy } from "class-validator";

import { CLINIC_SORT_FIELDS, SORT_DIRECTIONS } from "../clinics.constants.js";

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

function uppercaseOptionalString(value: unknown): string | null | undefined {
  const trimmed = trimOptionalString(value);
  return typeof trimmed === "string" ? trimmed.toUpperCase() : trimmed;
}

function normalizeWebsite(value: unknown): string | null | undefined {
  const trimmed = trimOptionalString(value);
  if (typeof trimmed !== "string") {
    return trimmed;
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    return trimmed;
  }
}

function isHttpUrl(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export class ListClinicsQueryDto {
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
  @MaxLength(100)
  public readonly city?: string;

  @IsOptional()
  @IsIn(CLINIC_SORT_FIELDS)
  public readonly sortBy: (typeof CLINIC_SORT_FIELDS)[number] = "createdAt";

  @IsOptional()
  @IsIn(SORT_DIRECTIONS)
  public readonly sortDirection: (typeof SORT_DIRECTIONS)[number] = "desc";
}

export class ClinicMutationDto {
  @IsOptional()
  @Transform(({ value }) => uppercaseOptionalString(value))
  @IsIn(["CDT", "NG"])
  public readonly legalEntityCode?: "CDT" | "NG";

  @IsOptional()
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  public readonly name?: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(160)
  public readonly legalName?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(80)
  public readonly taxId?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(80)
  public readonly registrationNumber?: string | null;

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
  @Transform(({ value }) => normalizeWebsite(value))
  @ValidateBy({ name: "isHttpUrl", validator: { validate: isHttpUrl } })
  @MaxLength(2048)
  public readonly website?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(120)
  public readonly contactPersonName?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(80)
  public readonly contactPersonRole?: string | null;

  @IsOptional()
  @Transform(({ value }) => lowercaseOptionalString(value))
  @IsEmail()
  @MaxLength(254)
  public readonly contactPersonEmail?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @Matches(/^[+()0-9 .-]{6,40}$/)
  public readonly contactPersonPhone?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(160)
  public readonly addressLine1?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(160)
  public readonly addressLine2?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(100)
  public readonly city?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(100)
  public readonly countyOrRegion?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(20)
  public readonly postalCode?: string | null;

  @IsOptional()
  @Transform(({ value }) => uppercaseOptionalString(value))
  @Matches(/^[A-Z]{2}$/)
  public readonly countryCode?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(160)
  public readonly billingName?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(80)
  public readonly billingTaxId?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(80)
  public readonly billingRegistrationNumber?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(160)
  public readonly billingAddressLine1?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(160)
  public readonly billingAddressLine2?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(100)
  public readonly billingCity?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(100)
  public readonly billingCountyOrRegion?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(20)
  public readonly billingPostalCode?: string | null;

  @IsOptional()
  @Transform(({ value }) => uppercaseOptionalString(value))
  @Matches(/^[A-Z]{2}$/)
  public readonly billingCountryCode?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(2000)
  public readonly internalNotes?: string | null;
}

export class CreateClinicDto extends ClinicMutationDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  public declare readonly name: string;
}

export class UpdateClinicDto extends ClinicMutationDto {}
