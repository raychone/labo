import { Transform, Type } from "class-transformer";
import { IsISO8601, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

function trimOptional(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export class AuditListQueryDto {
  @IsOptional()
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  @MaxLength(120)
  public readonly actor?: string;

  @IsOptional()
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  @MaxLength(120)
  public readonly action?: string;

  @IsOptional()
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  @MaxLength(80)
  public readonly actorUserId?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly dateFrom?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  public readonly pageSize = 25;

  @IsOptional()
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  @MaxLength(100)
  public readonly resourceType?: string;
}
