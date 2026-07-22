import { z } from "zod";

export const loginFormSchema = z.object({
  email: z.string().trim().email("Introdu o adresa de email valida."),
  password: z.string().min(8, "Parola trebuie sa aiba cel putin 8 caractere."),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
