import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

const SORT_DIRECTIONS = ["asc", "desc"] as const;
const DELIVERY_PREPARATION_GROUP_STATUSES = ["DRAFT", "READY", "CANCELLED"] as const;
const LOGISTICS_BLOCK_REASON_CODES = ["MISSING_INFO", "DOCTOR_CONFIRMATION", "MISSING_COMPONENTS", "TECHNICAL_ISSUE", "DEADLINE_CLARIFICATION", "OTHER"] as const;
const LOGISTICS_CENTER_CATEGORIES = ["ALL", "INTRARI_ASTAZI", "DE_VERIFICAT", "IN_PRODUCTIE", "NEASIGNATE", "BLOCARE", "URGENTE", "INTARZIATE", "FINALIZATE_AZI", "DE_AMBALAT", "IN_AMBALARE", "GATA_DE_LIVRARE", "NEFACTURATE"] as const;
const LOGISTICS_DUE_STATES = ["ON_TRACK", "DUE_SOON", "OVERDUE"] as const;
const LOGISTICS_LOCATION_CODES = ["RECEPTIE", "PRODUCTIE", "RAFT_FINISARE", "ZONA_AMBALARE", "GATA_LIVRARE"] as const;
const LOGISTICS_SORT_FIELDS = ["createdAt", "requestedDeliveryDate", "updatedAt", "priority", "workCode"] as const;
const LOGISTICS_STATUSES = ["RECEIVED", "IN_PRODUCTION", "BLOCKED", "READY_FOR_PACKING", "PACKING", "READY_FOR_DELIVERY", "HANDED_TO_DELIVERY", "DELIVERED"] as const;

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

function trimRequiredString(value: unknown): string {
  return typeof value === "string" ? value.trim() : value as string;
}

export class LogisticsCenterQueryDto {
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
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(120)
  public readonly search?: string | null;

  @IsOptional()
  @IsIn(LOGISTICS_CENTER_CATEGORIES)
  public readonly category: (typeof LOGISTICS_CENTER_CATEGORIES)[number] = "ALL";

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly clinicId?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly doctorId?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly technicianId?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(64)
  public readonly workflowStageKey?: string | null;

  @IsOptional()
  @IsIn(LOGISTICS_STATUSES)
  public readonly logisticsStatus?: (typeof LOGISTICS_STATUSES)[number];

  @IsOptional()
  @IsString()
  public readonly billingStatus?: string;

  @IsOptional()
  @IsIn(["NORMAL", "URGENT"])
  public readonly priority?: "NORMAL" | "URGENT";

  @IsOptional()
  @IsIn(LOGISTICS_DUE_STATES)
  public readonly dueState?: (typeof LOGISTICS_DUE_STATES)[number];

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly dateFrom?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly dateTo?: string;

  @IsOptional()
  @IsIn(LOGISTICS_SORT_FIELDS)
  public readonly sortBy: (typeof LOGISTICS_SORT_FIELDS)[number] = "requestedDeliveryDate";

  @IsOptional()
  @IsIn(SORT_DIRECTIONS)
  public readonly sortDirection: (typeof SORT_DIRECTIONS)[number] = "asc";
}

export class DeliveryPreparationGroupsQueryDto {
  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly clinicId?: string | null;

  @IsOptional()
  @IsIn(DELIVERY_PREPARATION_GROUP_STATUSES)
  public readonly status?: (typeof DELIVERY_PREPARATION_GROUP_STATUSES)[number];
}

export class UpdateLogisticsLocationDto {
  @IsIn(LOGISTICS_LOCATION_CODES)
  public readonly locationCode!: (typeof LOGISTICS_LOCATION_CODES)[number];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly version!: number;
}

export class BlockWorkDto {
  @IsIn(LOGISTICS_BLOCK_REASON_CODES)
  public readonly reasonCode!: (typeof LOGISTICS_BLOCK_REASON_CODES)[number];

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(1000)
  public readonly reasonNotes?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly version!: number;
}

export class LogisticsTransitionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly version!: number;

  @IsOptional()
  @IsBoolean()
  public readonly workflowOverride?: boolean;
}

export class CreateDeliveryPreparationGroupDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public readonly clinicId!: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly plannedDate?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(1000)
  public readonly notes?: string | null;
}

export class UpdateDeliveryPreparationGroupDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly plannedDate?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(1000)
  public readonly notes?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly version!: number;
}

export class DeliveryPreparationWorkDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public readonly workOrderId!: string;
}
