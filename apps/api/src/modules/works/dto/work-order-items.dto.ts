import { Transform } from "class-transformer";
import { ArrayUnique, IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, MaxLength, Min } from "class-validator";

import { ADULT_FDI_TEETH, ANATOMICAL_SCOPE_TYPES } from "@dental-lab/shared";

function trimOptional(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export class CreateWorkOrderItemDto {
  @IsIn(ANATOMICAL_SCOPE_TYPES)
  public readonly scope!: (typeof ANATOMICAL_SCOPE_TYPES)[number];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @IsIn([...ADULT_FDI_TEETH], { each: true })
  public readonly teeth?: number[];

  @IsOptional()
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  public readonly workTypeId?: string | null;

  @IsOptional()
  @IsObject()
  public readonly customWorkTypeSnapshot?: Record<string, unknown> | null;

  @IsOptional()
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  @MaxLength(80)
  public readonly shade?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  @MaxLength(80)
  public readonly implantPlatform?: string | null;

  @IsOptional()
  @IsObject()
  public readonly customImplantPlatformSnapshot?: Record<string, unknown> | null;

  @IsOptional()
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  @MaxLength(120)
  public readonly restorationType?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  @MaxLength(2000)
  public readonly technicalCodeNotes?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  @MaxLength(2000)
  public readonly notes?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  public readonly baseUnitPriceMinor?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  public readonly totalPriceMinor?: number;

  @IsOptional()
  @IsString()
  public readonly currency?: string | null;

  @IsOptional()
  @IsObject()
  public readonly commercialSnapshot?: Record<string, unknown> | null;
}

export class UpdateWorkOrderItemDto {
  @IsOptional()
  @IsIn(ANATOMICAL_SCOPE_TYPES)
  public readonly scope?: (typeof ANATOMICAL_SCOPE_TYPES)[number];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @IsIn([...ADULT_FDI_TEETH], { each: true })
  public readonly teeth?: number[];

  @IsOptional()
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  public readonly workTypeId?: string | null;

  @IsOptional()
  @IsObject()
  public readonly customWorkTypeSnapshot?: Record<string, unknown> | null;

  @IsOptional()
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  @MaxLength(80)
  public readonly shade?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  @MaxLength(80)
  public readonly implantPlatform?: string | null;

  @IsOptional()
  @IsObject()
  public readonly customImplantPlatformSnapshot?: Record<string, unknown> | null;

  @IsOptional()
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  @MaxLength(120)
  public readonly restorationType?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  @MaxLength(2000)
  public readonly technicalCodeNotes?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  @MaxLength(2000)
  public readonly notes?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  public readonly baseUnitPriceMinor?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  public readonly totalPriceMinor?: number;

  @IsOptional()
  @IsString()
  public readonly currency?: string | null;

  @IsOptional()
  @IsObject()
  public readonly commercialSnapshot?: Record<string, unknown> | null;
}
