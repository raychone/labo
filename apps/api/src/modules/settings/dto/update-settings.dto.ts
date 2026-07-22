import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateBy,
} from "class-validator";
import { Transform } from "class-transformer";
import {
  SETTINGS_SUPPORTED_CURRENCIES,
  SETTINGS_SUPPORTED_LOCALES,
  SETTINGS_SUPPORTED_TIMEZONES,
} from "../settings.constants.js";

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
    const url = new URL(trimmed);
    return url.toString();
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

function normalizeHexColor(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim().toLowerCase() : value as string | undefined;
}

export class UpdateSettingsDto {
  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  public readonly laboratoryName?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(160)
  public readonly legalName?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(80)
  public readonly companyRegistrationNumber?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(80)
  public readonly taxId?: string | null;

  @IsOptional()
  @Transform(({ value }) => typeof value === "string" ? value.trim().toLowerCase() : value as string | null | undefined)
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
  @ValidateBy({
    constraints: [],
    name: "isHttpUrl",
    validator: {
      validate: isHttpUrl,
    },
  })
  @MaxLength(2048)
  public readonly website?: string | null;

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
  @IsIn(SETTINGS_SUPPORTED_TIMEZONES)
  public readonly timezone?: string;

  @IsOptional()
  @IsIn(SETTINGS_SUPPORTED_LOCALES)
  public readonly locale?: string;

  @IsOptional()
  @Transform(({ value }) => uppercaseOptionalString(value))
  @IsIn(SETTINGS_SUPPORTED_CURRENCIES)
  public readonly currency?: string | null;

  @IsOptional()
  @Transform(({ value }) => normalizeHexColor(value))
  @Matches(/^#[0-9a-f]{6}$/)
  public readonly primaryColor?: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(500)
  public readonly documentFooter?: string | null;
}
