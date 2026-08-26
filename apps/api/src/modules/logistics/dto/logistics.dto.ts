import { Transform, Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";

const SORT_DIRECTIONS = ["asc", "desc"] as const;
const DELIVERY_PREPARATION_GROUP_STATUSES = ["DRAFT", "READY", "CANCELLED"] as const;
const LOGISTICS_BLOCK_REASON_CODES = ["MISSING_INFO", "DOCTOR_CONFIRMATION", "MISSING_COMPONENTS", "TECHNICAL_ISSUE", "DEADLINE_CLARIFICATION", "OTHER"] as const;
const LOGISTICS_CENTER_CATEGORIES = ["ALL", "INTRARI_ASTAZI", "DE_VERIFICAT", "IN_PRODUCTIE", "NEASIGNATE", "BLOCARE", "URGENTE", "INTARZIATE", "FINALIZATE_AZI", "NEFACTURATE", "IN_ASTEPTARE", "DE_LIVRAT", "DE_RIDICAT"] as const;
const LOGISTICS_DUE_STATES = ["ON_TRACK", "DUE_SOON", "OVERDUE"] as const;
const LOGISTICS_LOCATION_CODES = ["RECEPTIE", "PRODUCTIE", "RAFT_FINISARE", "ZONA_AMBALARE", "GATA_LIVRARE"] as const;
const LOGISTICS_SORT_FIELDS = ["createdAt", "requestedDeliveryDate", "updatedAt", "priority", "workCode"] as const;
const LOGISTICS_STATUSES = ["RECEIVED", "IN_PRODUCTION", "BLOCKED", "HANDED_TO_DELIVERY", "DELIVERED"] as const;
const PICKUP_SCHEDULE_TYPES = ["EXACT", "RANGE"] as const;
const COURIER_ROUTE_STATUSES = ["DRAFT", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const COURIER_ROUTE_STOP_TYPES = ["DELIVERY", "PICKUP"] as const;
const COURIER_ROUTE_STOP_OUTCOMES = ["PENDING", "DELIVERED", "NOT_DELIVERED", "PICKED_UP", "NOT_PICKED_UP"] as const;
const LOGISTICS_MARKERS = ["MARKER_1", "MARKER_2", "MARKER_3", "MARKER_4", "MARKER_5"] as const;

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
  @Type(() => Number)
  @IsIn([1, 2, 3])
  public readonly deliveryHorizonDays?: 1 | 2 | 3;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly technicianId?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly receptionUserId?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly workTypeId?: string | null;

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
  @Type(() => Number)
  @IsIn([1, 2, 3])
  public readonly pickupHorizonDays?: 1 | 2 | 3;

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
  @IsISO8601({ strict: true })
  public readonly exactDate?: string;

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

export class UpdateLogisticsWorkActionsDto {
  @IsOptional()
  @IsBoolean()
  public readonly requiresDelivery?: boolean;

  @IsOptional()
  @IsBoolean()
  public readonly requiresPickup?: boolean;

  @IsOptional()
  @IsIn(LOGISTICS_MARKERS)
  public readonly marker?: (typeof LOGISTICS_MARKERS)[number] | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(2000)
  public readonly logisticsNote?: string | null;
}

export class CreateLogisticsWorkBodyDto {
  @IsString()
  @MinLength(2)
  public readonly work!: string;
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

export class CreatePickupRequestDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public readonly clinicId!: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly doctorId?: string | null;

  @IsISO8601({ strict: true })
  public readonly scheduledDate!: string;

  @IsIn(PICKUP_SCHEDULE_TYPES)
  public readonly scheduleType!: (typeof PICKUP_SCHEDULE_TYPES)[number];

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly exactTime?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly windowStartTime?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly windowEndTime?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(300)
  public readonly address?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(40)
  public readonly phone?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(1000)
  public readonly notes?: string | null;
}

export class UpdatePickupRequestDto extends CreatePickupRequestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly version!: number;
}

export class CancelPickupRequestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly version!: number;
}

export class CourierRouteStopDto {
  @IsIn(COURIER_ROUTE_STOP_TYPES)
  public readonly type!: (typeof COURIER_ROUTE_STOP_TYPES)[number];

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly workOrderId?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly pickupRequestId?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(300)
  public readonly addressOverride?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(40)
  public readonly phoneOverride?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(500)
  public readonly stopNotes?: string | null;
}

export class CreateCourierRouteDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  public readonly name!: string;

  @IsISO8601({ strict: true })
  public readonly routeDate!: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly courierUserId?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(1000)
  public readonly notes?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CourierRouteStopDto)
  public readonly stops!: readonly CourierRouteStopDto[];
}

export class UpdateCourierRouteDto extends CreateCourierRouteDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly version!: number;
}

export class CourierRoutesQueryDto {
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
  public readonly courierUserId?: string | null;

  @IsOptional()
  @IsIn(COURIER_ROUTE_STATUSES)
  public readonly status?: (typeof COURIER_ROUTE_STATUSES)[number];

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly dateFrom?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly dateTo?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly exactDate?: string;
}

export class RecordCourierRouteStopOutcomeDto {
  @IsIn(COURIER_ROUTE_STOP_OUTCOMES)
  public readonly outcomeStatus!: (typeof COURIER_ROUTE_STOP_OUTCOMES)[number];

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(1000)
  public readonly notes?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(120)
  public readonly failureReason?: string | null;
}
