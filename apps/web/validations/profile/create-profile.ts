import { z } from "zod";

export const CreateProfileSchema = z.object({
  avatar: z
    .instanceof(File)
    .optional()
    .refine(
      (file) => !file || file.size <= 5 * 1024 * 1024,
      "File size must be less than 5MB",
    )
    .refine(
      (file) =>
        !file || ["image/jpeg", "image/png", "image/webp"].includes(file.type),
      "File must be JPEG, PNG, or WEBP",
    ),
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be less than 50 characters"),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must be less than 50 characters"),
  searchPreferences: z
    .object({
      youtube: z.object({
        enabled: z.boolean(),
      }),
      jamendo: z.object({
        enabled: z.boolean(),
      }),
    })
    .optional(),
});

export type CreateProfileData = z.infer<typeof CreateProfileSchema>;
