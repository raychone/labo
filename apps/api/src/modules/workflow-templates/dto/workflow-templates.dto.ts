import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

import {
  MAX_WORKFLOW_STAGE_DURATION_MINUTES,
  MAX_WORKFLOW_STAGES,
  WORKFLOW_STAGE_ROLE_CODES,
} from "../workflow-templates.constants.js";

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

export class WorkflowStageDefinitionDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  public readonly key!: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  public readonly name!: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(1000)
  public readonly description?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_WORKFLOW_STAGES - 1)
  public readonly sortOrder!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_WORKFLOW_STAGE_DURATION_MINUTES)
  public readonly estimatedDurationMinutes?: number | null;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(WORKFLOW_STAGE_ROLE_CODES.length)
  @ArrayUnique()
  @IsIn(WORKFLOW_STAGE_ROLE_CODES, { each: true })
  public readonly allowedRoleCodes!: readonly (typeof WORKFLOW_STAGE_ROLE_CODES)[number][];

  @IsBoolean()
  public readonly isInitial!: boolean;

  @IsBoolean()
  public readonly isFinal!: boolean;
}

export class ReplaceWorkflowStagesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_WORKFLOW_STAGES)
  @ValidateNested({ each: true })
  @Type(() => WorkflowStageDefinitionDto)
  public readonly stages!: readonly WorkflowStageDefinitionDto[];
}

export class CreateWorkflowTemplateDto {
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

export class UpdateWorkflowTemplateDto {
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
