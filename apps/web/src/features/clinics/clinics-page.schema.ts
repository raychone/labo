import { z } from "zod";

const nullableTrimmedString = (maxLength: number) =>
  z.string().trim().max(maxLength).transform((value) => value.length === 0 ? null : value).nullable();

const optionalEmail = z.string().trim().toLowerCase().email("Introdu un email valid.").max(254).nullable().or(z.literal("").transform(() => null));
const optionalPhone = z.string().trim().regex(/^[+()0-9 .-]{6,40}$/, "Telefonul poate contine cifre, spatii si prefix international.").nullable().or(z.literal("").transform(() => null));
const countryCode = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Foloseste cod ISO cu doua litere.");

export const clinicFormSchema = z.object({
  addressLine1: nullableTrimmedString(160),
  addressLine2: nullableTrimmedString(160),
  billingAddressLine1: nullableTrimmedString(160),
  billingAddressLine2: nullableTrimmedString(160),
  billingCity: nullableTrimmedString(100),
  billingCountryCode: countryCode,
  billingCountyOrRegion: nullableTrimmedString(100),
  billingName: nullableTrimmedString(160),
  billingPostalCode: nullableTrimmedString(20),
  billingRegistrationNumber: nullableTrimmedString(80),
  billingTaxId: nullableTrimmedString(80),
  city: nullableTrimmedString(100),
  contactPersonEmail: optionalEmail,
  contactPersonName: nullableTrimmedString(120),
  contactPersonPhone: optionalPhone,
  contactPersonRole: nullableTrimmedString(80),
  countryCode,
  countyOrRegion: nullableTrimmedString(100),
  email: optionalEmail,
  internalNotes: nullableTrimmedString(2000),
  legalName: nullableTrimmedString(160),
  name: z.string().trim().min(2, "Numele clinicii este obligatoriu.").max(160),
  phone: optionalPhone,
  postalCode: nullableTrimmedString(20),
  registrationNumber: nullableTrimmedString(80),
  taxId: nullableTrimmedString(80),
  website: z.string().trim().url("Introdu un URL valid.").refine((value) => value.startsWith("http://") || value.startsWith("https://"), "Website-ul trebuie sa foloseasca http sau https.").nullable().or(z.literal("").transform(() => null)),
});

export const doctorFormSchema = z.object({
  clinicId: z.string().min(1, "Alege clinica."),
  email: optionalEmail,
  firstName: z.string().trim().min(2, "Prenumele este obligatoriu.").max(80),
  internalNotes: nullableTrimmedString(2000),
  lastName: z.string().trim().min(2, "Numele este obligatoriu.").max(80),
  phone: optionalPhone,
  professionalCode: nullableTrimmedString(80),
});

export type ClinicFormValues = z.infer<typeof clinicFormSchema>;
export type DoctorFormValues = z.infer<typeof doctorFormSchema>;
