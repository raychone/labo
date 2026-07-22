import { WORK_TYPE_UNITS, decimalStringToMinor } from "@dental-lab/shared";
import { z } from "zod";

const nullableTrimmedString = (maxLength: number) =>
  z.string().trim().max(maxLength).transform((value) => value.length === 0 ? null : value).nullable();

export const workTypeFormSchema = z.object({
  basePriceDecimal: z.string().trim().refine((value) => decimalStringToMinor(value).ok, {
    message: "Introdu un pret nenegativ cu maximum doua zecimale.",
  }),
  description: nullableTrimmedString(1000),
  name: z.string().trim().min(2, "Denumirea este obligatorie.").max(160),
  unit: z.enum(WORK_TYPE_UNITS),
});

export type WorkTypeFormValues = z.infer<typeof workTypeFormSchema>;
