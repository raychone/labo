import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

import { MAX_WORK_FORM_FIELDS, WORK_FORM_FIELD_TYPES } from "../work-forms.constants.js";

function trimRequiredString(value: unknown): string {
  return typeof value === "string" ? value.trim() : value as string;
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

export class WorkFormOptionDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  public readonly value!: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  public readonly label!: string;
}

export class WorkFormFieldValidationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  public readonly minLength?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  public readonly maxLength?: number;

  @IsOptional()
  @Type(() => Number)
  public readonly min?: number;

  @IsOptional()
  @Type(() => Number)
  public readonly max?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  public readonly step?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  public readonly minDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  public readonly maxDate?: string;
}

export class WorkFormFieldDefinitionDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  public readonly key!: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  public readonly label!: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(500)
  public readonly helpText?: string | null;

  @IsIn(WORK_FORM_FIELD_TYPES)
  public readonly type!: (typeof WORK_FORM_FIELD_TYPES)[number];

  @IsBoolean()
  public readonly required!: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_WORK_FORM_FIELDS)
  public readonly sortOrder!: number;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(160)
  public readonly placeholder?: string | null;

  @IsOptional()
  public readonly defaultValue?: unknown;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => WorkFormOptionDto)
  public readonly options?: readonly WorkFormOptionDto[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WorkFormFieldValidationDto)
  public readonly validation?: WorkFormFieldValidationDto;
}

export class ReplaceWorkFormFieldsDto {
  @IsArray()
  @ArrayMaxSize(MAX_WORK_FORM_FIELDS)
  @ValidateNested({ each: true })
  @Type(() => WorkFormFieldDefinitionDto)
  public readonly fields!: readonly WorkFormFieldDefinitionDto[];
}

export class CreateWorkFormTemplateDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  public readonly name!: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(1000)
  public readonly description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  public readonly cloneFromTemplateId?: string;
}

export class UpdateWorkFormTemplateDto {
  @IsOptional()
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  public readonly name?: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(1000)
  public readonly description?: string | null;
}
