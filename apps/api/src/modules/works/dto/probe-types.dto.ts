import { Transform } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

function trim(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class CreateProbeTypeDto {
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(40)
  public readonly code?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(16)
  public readonly symbol?: string;
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(120)
  public readonly name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  public readonly sortOrder?: number;
}

export class UpdateProbeTypeDto {
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(40)
  public readonly code?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(16)
  public readonly symbol?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(120)
  public readonly name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  public readonly sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  public readonly isArchived?: boolean;
}
