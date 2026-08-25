import { URGENCY_LEVELS, WORK_PRIORITIES } from "@dental-lab/shared";
import { z } from "zod";

const nullableTrimmedString = (maxLength: number) =>
  z.string().trim().max(maxLength).transform((value) => value.length === 0 ? null : value).nullable();

export const WORK_SHADE_OPTIONS = [
  "A1", "A2", "A3", "A3.5", "A4", "B1", "B2", "B3", "B4", "C1", "C2", "C3", "C4", "D2", "D3", "D4",
] as const;

export const IMPLANT_PLATFORM_OPTIONS = [
  "Odentis", "AB Dental", "Alpha Bio", "Arum", "Dentium", "Inno", "JD", "Megagen", "Neobiotech", "Nobel", "Rhein", "Straumann", "Zimmer", "Alt tip",
] as const;

export const RESTORATION_TYPE_OPTIONS = [
  { label: "Cimentată", value: "cimentata" },
  { label: "Înșurubată", value: "insurubata" },
] as const;

const workFormValueSchema = z.union([
  z.boolean(),
  z.number().finite(),
  z.string(),
  z.array(z.string()),
  z.null(),
]);

export const workFormSchema = z.object({
  clinicId: z.string().trim(),
  clinicalNotes: nullableTrimmedString(2000),
  doctorId: z.string().trim(),
  externalReference: nullableTrimmedString(120),
  internalNotes: nullableTrimmedString(2000),
  implantPlatform: nullableTrimmedString(80),
  implantPlatformCustom: nullableTrimmedString(80),
  patientId: z.string().min(1, "Alege pacientul."),
  patientReference: nullableTrimmedString(80),
  priority: z.enum(WORK_PRIORITIES),
  urgency: z.enum(URGENCY_LEVELS).catch("NORMAL"),
  quantity: z.number().int().min(1, "Numărul minim de elemente este 1.").max(99, "Numărul maxim de elemente este 99."),
  requestedDeliveryDate: z.string().min(1, "Alege data termenului."),
  requestedDeliveryTime: z.string().regex(/^$|^\d{2}:\d{2}$/, "Ora termenului trebuie să fie HH:mm."),
  restorationType: z.enum(["cimentata", "insurubata"]).nullable(),
  shade: nullableTrimmedString(80),
  workFormValues: z.record(z.string(), workFormValueSchema),
  workTypeId: z.string().min(1, "Alege tipul lucrării."),
});

export type WorkFormValues = z.infer<typeof workFormSchema>;
