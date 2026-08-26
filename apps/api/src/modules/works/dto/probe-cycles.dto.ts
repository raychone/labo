import { Transform } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsISO8601, IsOptional, IsString } from "class-validator";

function trim(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class SelectProbeTypeDto {
  @Transform(({ value }) => trim(value))
  @IsString()
  public readonly probeTypeId!: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  public readonly probeTypeIds?: readonly string[];
}

export class UpdateProbeDeadlineDto {
  @IsISO8601({ strict: true })
  public readonly deadlineAt!: string;
}

export class ReceiveProbeDto {
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  public readonly probeTypeId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public readonly probeTypeIds?: readonly string[];

  @IsISO8601({ strict: true })
  public readonly deadlineAt!: string;
}
