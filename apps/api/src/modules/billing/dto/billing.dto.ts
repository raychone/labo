import { Transform, Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

import { BILLING_DOCUMENT_SORT_FIELDS, BILLING_GROUP_BY, BILLING_SORT_DIRECTIONS } from "../billing.constants.js";

const BILLING_DOCUMENT_TYPES = ["PROFORMA", "INVOICE"] as const;
const BILLING_DOCUMENT_STATUSES = ["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "CANCELLED"] as const;
const BILLING_ADJUSTMENT_SCOPES = ["WORK", "PATIENT", "DOCUMENT"] as const;
const BILLING_ADJUSTMENT_MODES = ["PERCENTAGE", "FIXED"] as const;
const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CARD", "OTHER"] as const;
const PAYMENT_STATUSES = ["UNPAID", "PARTIALLY_PAID", "PAID"] as const;
const DOCUMENT_PAYMENT_FILTERS = ["ALL", "UNPAID", "PARTIALLY_PAID", "PAID", "OUTSTANDING", "DUE", "OVERDUE", "CANCELLED"] as const;

type BillingDocumentType = (typeof BILLING_DOCUMENT_TYPES)[number];
type BillingDocumentStatus = (typeof BILLING_DOCUMENT_STATUSES)[number];
type BillingAdjustmentScope = (typeof BILLING_ADJUSTMENT_SCOPES)[number];
type BillingAdjustmentMode = (typeof BILLING_ADJUSTMENT_MODES)[number];
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
  public readonly groupBy?: (typeof BILLING_GROUP_BY)[number] = "clinic";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  public readonly year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  public readonly month?: number;
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
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(120)
  public readonly patient?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(80)
  public readonly workCode?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly cycleNumber?: number;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(80)
  public readonly status?: string | null;

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
  @IsISO8601({ strict: true })
  public readonly dueDateFrom?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  public readonly dueDateTo?: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(80)
  public readonly workCode?: string | null;

  @IsOptional()
  @IsIn(BILLING_DOCUMENT_SORT_FIELDS)
  public readonly sortBy: (typeof BILLING_DOCUMENT_SORT_FIELDS)[number] = "createdAt";

  @IsOptional()
  @IsIn(BILLING_SORT_DIRECTIONS)
  public readonly sortDirection: (typeof BILLING_SORT_DIRECTIONS)[number] = "desc";
}

export class BillingAdjustmentDto {
  @IsIn(BILLING_ADJUSTMENT_SCOPES)
  public readonly scope!: BillingAdjustmentScope;

  @IsIn(BILLING_ADJUSTMENT_MODES)
  public readonly mode!: BillingAdjustmentMode;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly workOrderId?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(160)
  public readonly patientName?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly amountMinor?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0.01)
  @Max(100)
  public readonly percentage?: number;
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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @Type(() => BillingAdjustmentDto)
  public readonly adjustments?: readonly BillingAdjustmentDto[];
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

export class DocumentShareAttemptDto {
  @IsIn(["EMAIL", "WHATSAPP", "SHARE"])
  public readonly channel!: "EMAIL" | "WHATSAPP" | "SHARE";

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(320)
  public readonly recipient?: string | null;
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
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  public readonly doctorId?: string | null;

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
