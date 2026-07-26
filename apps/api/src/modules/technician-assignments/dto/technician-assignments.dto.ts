import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

const queueCategories = ["ALL", "UNSTARTED", "IN_PROGRESS", "URGENT", "DUE_TODAY", "OVERDUE"] as const;
const stageStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;
const priorities = ["NORMAL", "URGENT"] as const;
const sortFields = ["priority", "requestedDeliveryDate", "startedAt"] as const;
const sortOrders = ["asc", "desc"] as const;

function trimOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return value === null ? undefined : value as string | undefined;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export class AssignStageDto {
  @IsOptional()
  @IsBoolean()
  public readonly confirmInProgress?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly expectedVersion!: number;

  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly userId!: string;
}

export class UnassignStageDto {
  @IsOptional()
  @IsBoolean()
  public readonly confirmInProgress?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly expectedVersion!: number;
}

export class TechnicianWorkbenchQueryDto {
  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly clinicId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  public readonly pageSize: number = 20;

  @IsOptional()
  @IsIn(priorities)
  public readonly priority?: (typeof priorities)[number];

  @IsOptional()
  @IsIn(queueCategories)
  public readonly queue?: (typeof queueCategories)[number];

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(120)
  public readonly search?: string;

  @IsOptional()
  @IsIn(sortFields)
  public readonly sortBy: (typeof sortFields)[number] = "requestedDeliveryDate";

  @IsOptional()
  @IsIn(sortOrders)
  public readonly sortOrder: (typeof sortOrders)[number] = "asc";

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly stageKey?: string;

  @IsOptional()
  @IsIn(stageStatuses)
  public readonly status?: (typeof stageStatuses)[number];

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly technicianId?: string;
}
