import { z } from "zod";

export const ForgotPasswordSchema = z.object({
  email: z
    .email("Please enter a valid email address")
    .min(1, "Email is required"),
});

export type ForgotPasswordData = z.infer<typeof ForgotPasswordSchema>;
