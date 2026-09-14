import { ANATOMICAL_SCOPE_TYPES, PRICING_ADJUSTMENT_TYPES, PRICING_AGREEMENT_SUBJECT_TYPES, PRICING_CATEGORIES, PRICING_RULE_SCOPES, TECHNICIAN_OPERATION_CATEGORIES, TECHNICIAN_OPERATION_QUANTITY_RULES, WORK_TYPE_SHADE_OPTIONS, WORK_TYPE_UNITS } from "@dental-lab/shared";
import { z } from "zod";

const moneyDecimal = z
  .string()
  .trim()
  .min(1, "Suma este obligatorie.")
  .regex(/^\d+([.,]\d{1,2})?$/, "Folosește format de sumă cu maximum 2 zecimale.");

export const catalogFormSchema = z.object({
  category: z.string().trim().min(1, "Categoria este obligatorie."),
  colorHex: z.string().regex(/^#[0-9A-F]{6}$/i, "Alege o culoare validă.").or(z.literal("")),
  displayName: z.string().trim().max(160).optional(),
  isActive: z.boolean(),
  notes: z.string().trim().max(1000).optional(),
  sortOrder: z.number().int().min(0).max(10_000),
  standardPriceDecimal: moneyDecimal,
  unit: z.enum(WORK_TYPE_UNITS),
  workTypeId: z.string().trim().optional(),
  workTypeName: z.string().trim().optional(),
  workTypeSymbol: z.string().trim().optional(),
  workTypeDescription: z.string().trim().max(1000).optional(),
  allowedAnatomicalScopes: z.array(z.enum(ANATOMICAL_SCOPE_TYPES)).min(1, "Alege cel puțin un domeniu anatomic."),
  allowedShades: z.array(z.enum(WORK_TYPE_SHADE_OPTIONS)),
  customShades: z.array(z.string().trim().min(1).max(80)),
  technicianOperationIds: z.array(z.string()),
  probeTypeIds: z.array(z.string()),
  gingieEnabled: z.boolean(),
  gingieAmountDecimal: z.union([z.literal(""), moneyDecimal]).optional(),
  placataEnabled: z.boolean(),
  placataAmountDecimal: z.union([z.literal(""), moneyDecimal]).optional(),
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
  category: z.enum(TECHNICIAN_OPERATION_CATEGORIES),
  description: z.string().trim().max(1000).optional(),
  name: z.string().trim().min(2, "Denumirea este obligatorie.").max(160),
  quantityRule: z.enum(TECHNICIAN_OPERATION_QUANTITY_RULES),
  workTypeIds: z.array(z.string()),
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
