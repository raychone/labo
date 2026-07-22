import { z } from "zod";

export const userBaseSchema = z.object({
  displayName: z.string().trim().min(2, "Numele trebuie sa aiba cel putin 2 caractere.").max(120),
  email: z.string().trim().email("Introdu o adresa de email valida.").max(254),
});

export const createUserSchema = userBaseSchema.extend({
  isActive: z.boolean(),
  roleKeys: z.array(z.string()).max(8),
  temporaryPassword: z.string().min(8, "Parola temporara trebuie sa aiba cel putin 8 caractere.").max(256),
});

export const resetPasswordSchema = z.object({
  confirmTemporaryPassword: z.string().min(8),
  temporaryPassword: z.string().min(8, "Parola temporara trebuie sa aiba cel putin 8 caractere.").max(256),
}).refine((value) => value.temporaryPassword === value.confirmTemporaryPassword, {
  message: "Parolele temporare nu coincid.",
  path: ["confirmTemporaryPassword"],
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
export type UserBaseFormValues = z.infer<typeof userBaseSchema>;
