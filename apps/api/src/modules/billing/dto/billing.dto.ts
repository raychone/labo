import { Transform, Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

import { BILLING_DOCUMENT_SORT_FIELDS, BILLING_GROUP_BY, BILLING_SORT_DIRECTIONS } from "../billing.constants.js";

const BILLING_DOCUMENT_TYPES = ["PROFORMA", "INVOICE"] as const;
const BILLING_DOCUMENT_STATUSES = ["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "CANCELLED"] as const;
const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CARD", "OTHER"] as const;
const PAYMENT_STATUSES = ["UNPAID", "PARTIALLY_PAID", "PAID"] as const;
const DOCUMENT_PAYMENT_FILTERS = ["ALL", "UNPAID", "PARTIALLY_PAID", "PAID", "OUTSTANDING", "DUE", "OVERDUE", "CANCELLED"] as const;

type BillingDocumentType = (typeof BILLING_DOCUMENT_TYPES)[number];
type BillingDocumentStatus = (typeof BILLING_DOCUMENT_STATUSES)[number];
type PaymentMethod = (typeof PAYMENT_METHODS)[number];
type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
type DocumentPaymentFilter = (typeof DOCUMENT_PAYMENT_FILTERS)[number];

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

export class BillingRangeQueryDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly dateFrom?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly dateTo?: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly clinicId?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly doctorId?: string | null;

  @IsOptional()
  @IsIn(BILLING_GROUP_BY)
  public readonly groupBy: (typeof BILLING_GROUP_BY)[number] = "clinic";
}

export class BillableWorksQueryDto extends BillingRangeQueryDto {
  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(120)
  public readonly search?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly workTypeId?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  public readonly uninvoicedOnly: boolean = true;
}

export class ListBillingDocumentsQueryDto {
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
  @IsIn(BILLING_DOCUMENT_TYPES)
  public readonly type?: BillingDocumentType;

  @IsOptional()
  @IsIn(BILLING_DOCUMENT_STATUSES)
  public readonly status?: BillingDocumentStatus;

  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  public readonly paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsIn(DOCUMENT_PAYMENT_FILTERS)
  public readonly paymentFilter?: DocumentPaymentFilter;

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
  @MaxLength(120)
  public readonly patient?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(80)
  public readonly receiptNumber?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(160)
  public readonly paymentReference?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public readonly amountMinMinor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public readonly amountMaxMinor?: number;

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly dateFrom?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly dateTo?: string;

  @IsOptional()
  @IsIn(BILLING_DOCUMENT_SORT_FIELDS)
  public readonly sortBy: (typeof BILLING_DOCUMENT_SORT_FIELDS)[number] = "createdAt";

  @IsOptional()
  @IsIn(BILLING_SORT_DIRECTIONS)
  public readonly sortDirection: (typeof BILLING_SORT_DIRECTIONS)[number] = "desc";
}

export class CreateBillingDocumentDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsISO8601({ strict: true })
  public readonly issueDate!: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsISO8601({ strict: true })
  public readonly dueDate?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(2000)
  public readonly notes?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  public readonly workOrderIds!: readonly string[];
}

export class UpdateBillingDocumentDto {
  @IsOptional()
  @Transform(({ value }) => trimRequiredString(value))
  @IsISO8601({ strict: true })
  public readonly issueDate?: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsISO8601({ strict: true })
  public readonly dueDate?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(2000)
  public readonly notes?: string | null;
}

export class ReplaceBillingLinesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  public readonly workOrderIds!: readonly string[];
}

export class RecordPaymentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly amountMinor!: number;

  @IsISO8601({ strict: true })
  public readonly paymentDate!: string;

  @IsIn(PAYMENT_METHODS)
  public readonly method!: PaymentMethod;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(80)
  public readonly receiptNumber?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsISO8601({ strict: true })
  public readonly receiptDate?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(160)
  public readonly reference?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(1000)
  public readonly notes?: string | null;
}

export class SearchBillingQueryDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MaxLength(120)
  public readonly q!: string;
}

export class ClinicStatementQueryDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public readonly clinicId!: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly dateFrom?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly dateTo?: string;
}

export class DoctorStatementQueryDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  public readonly doctorId!: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly dateFrom?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly dateTo?: string;
}

export class UpsertBillingSeriesDto {
  @IsIn(BILLING_DOCUMENT_TYPES)
  public readonly documentType!: BillingDocumentType;

  @Transform(({ value }) => trimRequiredString(value).toUpperCase())
  @IsString()
  @MaxLength(16)
  public readonly prefix!: string;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  public readonly year!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public readonly currentNumber: number = 0;

  @IsOptional()
  @Type(() => Boolean)
  public readonly isActive: boolean = true;
}
