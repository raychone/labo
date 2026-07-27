import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsISO8601, IsObject, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

const DELIVERY_STATUSES = ["PLANNED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED", "CANCELLED"] as const;
const DELIVERY_FAILURE_REASON_CODES = ["CLINIC_CLOSED", "RECIPIENT_UNAVAILABLE", "ADDRESS_PROBLEM", "DELIVERY_REFUSED", "COURIER_PROBLEM", "OTHER"] as const;
const DELIVERY_FILTERS = ["ALL", "UNASSIGNED", "TODAY", "BY_COURIER", "PICKED_UP", "IN_TRANSIT", "FAILED", "DELIVERED", "CANCELLED"] as const;
const DELIVERY_SORT_FIELDS = ["plannedDate", "sequenceOrder", "createdAt", "updatedAt", "code"] as const;
const SORT_DIRECTIONS = ["asc", "desc"] as const;
const SIGNATURE_OVERRIDE_REASON_CODES = ["RECIPIENT_REFUSED_SIGNATURE", "DEVICE_UNAVAILABLE", "TECHNICAL_FAILURE", "OTHER"] as const;

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

export class ListDeliveriesQueryDto {
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
  @IsIn(DELIVERY_FILTERS)
  public readonly filter: (typeof DELIVERY_FILTERS)[number] = "ALL";

  @IsOptional()
  @IsIn(DELIVERY_STATUSES)
  public readonly status?: (typeof DELIVERY_STATUSES)[number];

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly clinicId?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly courierUserId?: string | null;

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly dateFrom?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly dateTo?: string;

  @IsOptional()
  @IsIn(DELIVERY_SORT_FIELDS)
  public readonly sortBy: (typeof DELIVERY_SORT_FIELDS)[number] = "plannedDate";

  @IsOptional()
  @IsIn(SORT_DIRECTIONS)
  public readonly sortDirection: (typeof SORT_DIRECTIONS)[number] = "asc";
}

export class CreateDeliveryDto {
  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly courierUserId?: string | null;

  @IsISO8601({ strict: true })
  public readonly plannedDate!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly sequenceOrder?: number | null;
}

export class UpdateDeliveryDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly plannedDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly sequenceOrder?: number | null;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly version!: number;
}

export class AssignCourierDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public readonly courierUserId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly version!: number;
}

export class DeliveryVersionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly version!: number;
}

export class CompleteDeliveryDto {
  @IsOptional()
  @IsBoolean()
  public readonly confirmedHandover?: boolean;

  @IsOptional()
  @IsBoolean()
  public readonly confirmedWithoutSignature?: boolean;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MaxLength(160)
  public readonly recipientName!: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(120)
  public readonly recipientRole?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(1000)
  public readonly deliveryNotes?: string | null;

  @IsOptional()
  @IsObject()
  public readonly signature?: unknown;

  @IsOptional()
  @IsIn(SIGNATURE_OVERRIDE_REASON_CODES)
  public readonly overrideReasonCode?: (typeof SIGNATURE_OVERRIDE_REASON_CODES)[number];

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(1000)
  public readonly overrideDetails?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly version!: number;
}

export class FailDeliveryDto {
  @IsIn(DELIVERY_FAILURE_REASON_CODES)
  public readonly reasonCode!: (typeof DELIVERY_FAILURE_REASON_CODES)[number];

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(1000)
  public readonly failureDetails?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly version!: number;
}

export class RescheduleDeliveryDto {
  @IsISO8601({ strict: true })
  public readonly plannedDate!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly sequenceOrder?: number | null;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly version!: number;
}
