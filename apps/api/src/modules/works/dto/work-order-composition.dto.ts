import { Transform, Type } from "class-transformer";
import { ArrayUnique, IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";

import { ADULT_FDI_TEETH, ANATOMICAL_SCOPE_TYPES } from "@dental-lab/shared";

function trimOptional(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export class WorkOrderCompositionItemDto {
  @IsOptional()
  @IsString()
  public readonly id?: string;

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
  @IsArray()
  @IsObject({ each: true })
  public readonly selectedAddOns?: readonly { readonly code: string; readonly amountMinor?: number | null }[];
}

export class UpdateWorkOrderCompositionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkOrderCompositionItemDto)
  public readonly items!: WorkOrderCompositionItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompositionConnectionDto)
  public readonly toothConnections!: CompositionConnectionDto[];
}

class CompositionConnectionDto {
  @IsInt()
  @IsIn([...ADULT_FDI_TEETH])
  public readonly toothA!: number;

  @IsInt()
  @IsIn([...ADULT_FDI_TEETH])
  public readonly toothB!: number;
}
