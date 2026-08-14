import { BadRequestException } from "@nestjs/common";

export function parseDateOnly(value: string, fieldName = "date"): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException(`${fieldName} must be a date-only value.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${fieldName} must be a valid date.`);
  }

  return date;
}

export function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function getDefaultBillingRange(now = new Date()): { readonly from: Date; readonly to: Date } {
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  return { from, to };
}

export function getMonthBillingRange(year: number, month: number): { readonly from: Date; readonly to: Date } {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));

  return { from, to };
}

export function endOfDateOnly(value: Date): Date {
  const end = new Date(value);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

export function formatBillingNumber(prefix: string, year: number, number: number): string {
  return `${prefix}-${year}-${String(number).padStart(6, "0")}`;
}
