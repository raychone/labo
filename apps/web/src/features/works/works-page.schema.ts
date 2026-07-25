import { WORK_PRIORITIES } from "@dental-lab/shared";
import { z } from "zod";

const nullableTrimmedString = (maxLength: number) =>
  z.string().trim().max(maxLength).transform((value) => value.length === 0 ? null : value).nullable();

const workFormValueSchema = z.union([
  z.boolean(),
  z.number().finite(),
  z.string(),
  z.array(z.string()),
  z.null(),
]);

export const workFormSchema = z.object({
  clinicId: z.string().min(1, "Alege cabinetul."),
  clinicalNotes: nullableTrimmedString(2000),
  doctorId: z.string().min(1, "Alege medicul."),
  externalReference: nullableTrimmedString(120),
  internalNotes: nullableTrimmedString(2000),
  patientName: z.string().trim().min(2, "Numele pacientului este obligatoriu.").max(120),
  patientReference: nullableTrimmedString(80),
  priority: z.enum(WORK_PRIORITIES),
  quantity: z.number().int().min(1, "Cantitatea minima este 1.").max(99, "Cantitatea maxima este 99."),
  requestedDeliveryDate: z.string().min(1, "Alege termenul promis."),
  workFormValues: z.record(z.string(), workFormValueSchema),
  workTypeId: z.string().min(1, "Alege tipul lucrării."),
});

export type WorkFormValues = z.infer<typeof workFormSchema>;
