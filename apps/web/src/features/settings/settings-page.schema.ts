import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_COUNTRY_CODES,
} from "@dental-lab/shared";
import { z } from "zod";

const nullableTrimmedString = (maxLength: number) =>
  z.string().trim().max(maxLength).transform((value) => value.length === 0 ? null : value).nullable();

const nullableIban = z.string()
  .trim()
  .transform((value) => value.replace(/\s+/g, "").toUpperCase())
  .refine((value) => value.length === 0 || /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(value), "Introdu un IBAN valid ca format.")
  .transform((value) => value.length === 0 ? null : value)
  .nullable();

export const settingsFormSchema = z.object({
  addressLine1: nullableTrimmedString(160),
  addressLine2: nullableTrimmedString(160),
  bankName: nullableTrimmedString(120),
  city: nullableTrimmedString(100),
  companyRegistrationNumber: z.string().trim().regex(/^J[0-9A-Z./ -]{2,79}$/i, "Introdu un număr de registru valid pentru România.").nullable().or(z.literal("").transform(() => null)),
  countryCode: z.enum(SUPPORTED_COUNTRY_CODES),
  countyOrRegion: nullableTrimmedString(100),
  currency: z.enum(SUPPORTED_CURRENCIES),
  documentFooter: nullableTrimmedString(500),
  email: z.string().trim().toLowerCase().email("Introdu un email valid.").max(254).nullable().or(z.literal("").transform(() => null)),
  iban: nullableIban,
  legalName: z.string().trim().min(2, "Denumirea juridică este obligatorie.").max(160),
  phone: z.string().trim().regex(/^[+()0-9 .-]{6,40}$/, "Telefonul poate contine cifre, spatii si prefix international.").nullable().or(z.literal("").transform(() => null)),
  postalCode: nullableTrimmedString(20),
  taxId: z.string().trim().toUpperCase().regex(/^(RO)?[0-9]{2,13}$/, "Introdu un cod fiscal valid ca format.").nullable().or(z.literal("").transform(() => null)),
  website: z.string().trim().url("Introdu un URL valid.").refine((value) => value.startsWith("http://") || value.startsWith("https://"), "Website-ul trebuie să folosească http sau https.").nullable().or(z.literal("").transform(() => null)),
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;
