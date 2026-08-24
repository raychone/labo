import { PRICING_ADJUSTMENT_TYPES, PRICING_AGREEMENT_SUBJECT_TYPES, PRICING_CATEGORIES, PRICING_RULE_SCOPES, TECHNICIAN_MANEUVER_UNITS, WORK_TYPE_UNITS } from "@dental-lab/shared";
import { z } from "zod";

const moneyDecimal = z
  .string()
  .trim()
  .min(1, "Suma este obligatorie.")
  .regex(/^\d+([.,]\d{1,2})?$/, "Folosește format de sumă cu maximum 2 zecimale.");

export const catalogFormSchema = z.object({
  category: z.string().trim().min(1, "Categoria este obligatorie."),
  displayName: z.string().trim().max(160).optional(),
  executionDays: z.enum(["1", "2", "3", "4", "5", "6"]),
  isActive: z.boolean(),
  notes: z.string().trim().max(1000).optional(),
  sortOrder: z.number().int().min(0).max(10_000),
  standardPriceDecimal: moneyDecimal,
  unit: z.enum(WORK_TYPE_UNITS),
  workTypeId: z.string().trim().optional(),
  workTypeName: z.string().trim().optional(),
  workTypeSymbol: z.string().trim().optional(),
  workTypeDescription: z.string().trim().max(1000).optional(),
}).superRefine((values, context) => {
  if (!values.workTypeId && !values.workTypeName) {
    context.addIssue({ code: "custom", message: "Alege sau creează tipul de lucrare.", path: ["workTypeId"] });
  }
  if (values.workTypeId && !values.displayName) {
    context.addIssue({ code: "custom", message: "Denumirea este obligatorie.", path: ["displayName"] });
  }
  if (!values.workTypeId && !values.workTypeSymbol) {
    context.addIssue({ code: "custom", message: "Simbolul este obligatoriu pentru un tip nou.", path: ["workTypeSymbol"] });
  }
});

export const executionRulesFormSchema = z.object({
  rulesJson: z.string().trim().min(2, "Regulile sunt obligatorii."),
});

export const agreementFormSchema = z.object({
  adjustmentDecimal: z.string().trim().optional(),
  adjustmentPercentage: z.string().trim().optional(),
  adjustmentType: z.enum(PRICING_ADJUSTMENT_TYPES),
  category: z.string().trim().optional(),
  clinicId: z.string().trim().optional(),
  doctorId: z.string().trim().optional(),
  name: z.string().trim().min(1, "Numele acordului este obligatoriu.").max(160),
  notes: z.string().trim().max(1000).optional(),
  overridePriceDecimal: z.string().trim().optional(),
  priceCatalogItemId: z.string().trim().optional(),
  scope: z.enum(PRICING_RULE_SCOPES),
  subjectType: z.enum(PRICING_AGREEMENT_SUBJECT_TYPES),
  validFrom: z.string().trim().min(1, "Data de început este obligatorie."),
  validUntil: z.string().trim().optional(),
}).superRefine((values, context) => {
  if (values.subjectType === "CLINIC" && !values.clinicId) {
    context.addIssue({ code: "custom", message: "Alege clinica.", path: ["clinicId"] });
  }
  if (values.subjectType === "DOCTOR" && !values.doctorId) {
    context.addIssue({ code: "custom", message: "Alege medicul.", path: ["doctorId"] });
  }
  if (values.scope === "CATEGORY" && !values.category) {
    context.addIssue({ code: "custom", message: "Alege categoria.", path: ["category"] });
  }
  if (values.scope === "ITEM" && !values.priceCatalogItemId) {
    context.addIssue({ code: "custom", message: "Alege produsul din catalog.", path: ["priceCatalogItemId"] });
  }
  if (values.adjustmentType === "FIXED_AMOUNT" && !moneyDecimal.safeParse(values.adjustmentDecimal ?? "").success) {
    context.addIssue({ code: "custom", message: "Introdu ajustarea fixă.", path: ["adjustmentDecimal"] });
  }
  if (values.adjustmentType === "OVERRIDE_PRICE" && !moneyDecimal.safeParse(values.overridePriceDecimal ?? "").success) {
    context.addIssue({ code: "custom", message: "Introdu prețul final.", path: ["overridePriceDecimal"] });
  }
  if (values.adjustmentType === "PERCENTAGE" && !/^-?\d+([.,]\d{1,2})?$/.test(values.adjustmentPercentage ?? "")) {
    context.addIssue({ code: "custom", message: "Introdu procentul.", path: ["adjustmentPercentage"] });
  }
});

export const previewFormSchema = z.object({
  clinicId: z.string().trim().min(1, "Alege clinica."),
  doctorId: z.string().trim().min(1, "Alege medicul."),
  evaluationDate: z.string().trim().optional(),
  quantity: z.number().int().min(1).max(999),
  workTypeId: z.string().trim().min(1, "Alege tipul de lucrare."),
});

export const technicianOperationFormSchema = z.object({
  code: z.string().trim().min(1, "Codul este obligatoriu.").max(40),
  description: z.string().trim().max(1000).optional(),
  name: z.string().trim().min(2, "Denumirea este obligatorie.").max(160),
  pricingUnit: z.enum(TECHNICIAN_MANEUVER_UNITS, { message: "Alege unitatea de tarifare." }),
});

export const technicianRateFormSchema = z.object({
  effectiveFrom: z.string().trim().optional(),
  operationId: z.string().trim().min(1, "Alege manopera."),
  rateDecimal: moneyDecimal,
  technicianId: z.string().trim().min(1, "Alege tehnicianul."),
});

export type CatalogFormValues = z.infer<typeof catalogFormSchema>;
export type ExecutionRulesFormValues = z.infer<typeof executionRulesFormSchema>;
export type AgreementFormValues = z.infer<typeof agreementFormSchema>;
export type PreviewFormValues = z.infer<typeof previewFormSchema>;
export type TechnicianOperationFormValues = z.infer<typeof technicianOperationFormSchema>;
export type TechnicianRateFormValues = z.infer<typeof technicianRateFormSchema>;

export const pricingCategoryOptions = PRICING_CATEGORIES.map((category) => ({ label: category, value: category }));
