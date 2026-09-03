import { z } from "zod";

export const LoginSchema = z.object({
  email: z
    .email("Please enter a valid email address")
    .min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginData = z.infer<typeof LoginSchema>;
