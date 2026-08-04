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

import {
  MAX_WORK_FORM_FIELDS,
  WORK_FORM_COPY_TO_NEXT_CYCLE_POLICIES,
  WORK_FORM_FIELD_CYCLE_SCOPES,
  WORK_FORM_FIELD_EDITABLE_UNTIL,
  WORK_FORM_FIELD_ROLE_OWNERS,
  WORK_FORM_FIELD_SOURCE_KINDS,
  WORK_FORM_FIELD_TYPES,
  WORK_FORM_TEMPLATE_KINDS,
} from "../work-forms.constants.js";

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

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(64)
  public readonly sectionKey?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(160)
  public readonly sectionLabel?: string | null;

  @IsOptional()
  @IsIn(WORK_FORM_FIELD_ROLE_OWNERS)
  public readonly roleOwner?: (typeof WORK_FORM_FIELD_ROLE_OWNERS)[number];

  @IsOptional()
  @IsIn(WORK_FORM_FIELD_EDITABLE_UNTIL)
  public readonly editableUntil?: (typeof WORK_FORM_FIELD_EDITABLE_UNTIL)[number];

  @IsOptional()
  @IsIn(WORK_FORM_FIELD_CYCLE_SCOPES)
  public readonly cycleScope?: (typeof WORK_FORM_FIELD_CYCLE_SCOPES)[number];

  @IsOptional()
  @IsIn(WORK_FORM_COPY_TO_NEXT_CYCLE_POLICIES)
  public readonly copyToNextCyclePolicy?: (typeof WORK_FORM_COPY_TO_NEXT_CYCLE_POLICIES)[number];

  @IsOptional()
  @IsBoolean()
  public readonly printable?: boolean;

  @IsOptional()
  @IsIn(WORK_FORM_FIELD_SOURCE_KINDS)
  public readonly sourceKind?: (typeof WORK_FORM_FIELD_SOURCE_KINDS)[number];
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

  @IsOptional()
  @IsIn(WORK_FORM_TEMPLATE_KINDS)
  public readonly kind?: (typeof WORK_FORM_TEMPLATE_KINDS)[number];
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
