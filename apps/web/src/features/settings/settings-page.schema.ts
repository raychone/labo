import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_LOCALES,
  SUPPORTED_TIMEZONES,
} from "@dental-lab/shared";
import { z } from "zod";

const nullableTrimmedString = (maxLength: number) =>
  z.string().trim().max(maxLength).transform((value) => value.length === 0 ? null : value).nullable();

export const settingsFormSchema = z.object({
  addressLine1: nullableTrimmedString(160),
  addressLine2: nullableTrimmedString(160),
  city: nullableTrimmedString(100),
  companyRegistrationNumber: nullableTrimmedString(80),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Foloseste cod ISO cu doua litere."),
  countyOrRegion: nullableTrimmedString(100),
  currency: z.enum(SUPPORTED_CURRENCIES),
  documentFooter: nullableTrimmedString(500),
  email: z.string().trim().toLowerCase().email("Introdu un email valid.").max(254).nullable().or(z.literal("").transform(() => null)),
  laboratoryName: z.string().trim().min(2, "Numele laboratorului este obligatoriu.").max(120),
  legalName: nullableTrimmedString(160),
  locale: z.enum(SUPPORTED_LOCALES),
  phone: z.string().trim().regex(/^[+()0-9 .-]{6,40}$/, "Telefonul poate contine cifre, spatii si prefix international.").nullable().or(z.literal("").transform(() => null)),
  postalCode: nullableTrimmedString(20),
  primaryColor: z.string().trim().toLowerCase().regex(/^#[0-9a-f]{6}$/, "Foloseste o culoare hex valida."),
  taxId: nullableTrimmedString(80),
  timezone: z.enum(SUPPORTED_TIMEZONES),
  website: z.string().trim().url("Introdu un URL valid.").refine((value) => value.startsWith("http://") || value.startsWith("https://"), "Website-ul trebuie sa foloseasca http sau https.").nullable().or(z.literal("").transform(() => null)),
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;
