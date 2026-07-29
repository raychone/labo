import { PATIENT_SEX_VALUES } from "@dental-lab/shared";
import { z } from "zod";

const nullableTrimmedString = (maxLength: number) =>
  z.string().trim().max(maxLength).transform((value) => value.length === 0 ? null : value).nullable();

export const patientFormSchema = z.object({
  birthDate: z.string().nullable().transform((value) => value === "" ? null : value),
  firstName: z.string().trim().min(1, "Prenumele este obligatoriu.").max(80),
  lastName: z.string().trim().min(1, "Numele este obligatoriu.").max(80),
  notes: nullableTrimmedString(1000),
  sex: z.enum(PATIENT_SEX_VALUES),
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;
