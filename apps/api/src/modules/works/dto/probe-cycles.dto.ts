import { Transform } from "class-transformer";
import { IsISO8601, IsString } from "class-validator";

function trim(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class SelectProbeTypeDto {
  @Transform(({ value }) => trim(value))
  @IsString()
  public readonly probeTypeId!: string;
}

export class UpdateProbeDeadlineDto {
  @IsISO8601({ strict: true })
  public readonly deadlineAt!: string;
}

export class ReceiveProbeDto {
  @Transform(({ value }) => trim(value))
  @IsString()
  public readonly probeTypeId!: string;

  @IsISO8601({ strict: true })
  public readonly deadlineAt!: string;
}
