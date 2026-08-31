import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

import {
  OPERATIONAL_STATUS_DEADLINE_STATES,
  OPERATIONAL_STATUS_DEFAULT_PAGE_SIZE,
  OPERATIONAL_STATUS_DELIVERY_STATUSES,
  OPERATIONAL_STATUS_LEGAL_ENTITY_CODES,
  OPERATIONAL_STATUS_LOGISTICS_STATUSES,
  OPERATIONAL_STATUS_MAX_PAGE_SIZE,
  OPERATIONAL_STATUS_PRIORITIES,
  OPERATIONAL_STATUS_REAL_LAB_SHEET_STATUSES,
  OPERATIONAL_STATUS_SORT_DIRECTIONS,
  OPERATIONAL_STATUS_SORT_FIELDS,
  OPERATIONAL_STATUS_TABS,
  type OperationalStatusSortDirection,
  type OperationalStatusSortField,
  type OperationalStatusTab,
} from "../status.constants.js";

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

export class OperationalStatusQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  public readonly excludeDemo?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  public readonly transportOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsIn([1, 2, 3])
  public readonly transportHorizonDays?: 1 | 2 | 3;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(OPERATIONAL_STATUS_MAX_PAGE_SIZE)
  public readonly pageSize: number = OPERATIONAL_STATUS_DEFAULT_PAGE_SIZE;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(120)
  public readonly search?: string | null;

  @IsOptional()
  @IsIn(OPERATIONAL_STATUS_TABS)
  public readonly tab: OperationalStatusTab = "TODAY";

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
  public readonly patientId?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly workTypeId?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly ownerUserId?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly stageTechnicianUserId?: string | null;

  @IsOptional()
  @IsIn(OPERATIONAL_STATUS_LEGAL_ENTITY_CODES)
  public readonly executionLegalEntityCode?: (typeof OPERATIONAL_STATUS_LEGAL_ENTITY_CODES)[number];

  @IsOptional()
  @IsIn(OPERATIONAL_STATUS_PRIORITIES)
  public readonly priority?: (typeof OPERATIONAL_STATUS_PRIORITIES)[number];

  @IsOptional()
  @IsIn(OPERATIONAL_STATUS_LOGISTICS_STATUSES)
  public readonly logisticsStatus?: (typeof OPERATIONAL_STATUS_LOGISTICS_STATUSES)[number];

  @IsOptional()
  @IsIn(OPERATIONAL_STATUS_DELIVERY_STATUSES)
  public readonly deliveryStatus?: (typeof OPERATIONAL_STATUS_DELIVERY_STATUSES)[number];

  @IsOptional()
  @IsIn(OPERATIONAL_STATUS_DEADLINE_STATES)
  public readonly deadlineState?: (typeof OPERATIONAL_STATUS_DEADLINE_STATES)[number];

  @IsOptional()
  @IsIn(OPERATIONAL_STATUS_REAL_LAB_SHEET_STATUSES)
  public readonly sheetStatus?: (typeof OPERATIONAL_STATUS_REAL_LAB_SHEET_STATUSES)[number];

  @IsOptional()
  @IsIn(OPERATIONAL_STATUS_SORT_FIELDS)
  public readonly sortBy: OperationalStatusSortField = "effectiveDueAt";

  @IsOptional()
  @IsIn(OPERATIONAL_STATUS_SORT_DIRECTIONS)
  public readonly sortDirection: OperationalStatusSortDirection = "asc";
}
