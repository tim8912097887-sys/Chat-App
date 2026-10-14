import { z } from "zod";

const email = z
  .string("email should be a string")
  .trim()
  .toLowerCase()
  .pipe(z.email("email is invalid").max(254, "email is too long"));

export const loginSchema = z.object({
  email,
  password: z
    .string("password should be a string")
    .min(8, "password must be at least 8 characters")
    .max(72, "password must be less than 72 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;
