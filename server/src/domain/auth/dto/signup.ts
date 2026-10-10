import { z } from "zod";

const email = z
  .string("email should be a string")
  .trim()
  .toLowerCase()
  .pipe(z.email("email is invalid").max(254, "email is too long"));

export const signupSchema = z.object({
  name: z
    .string("name should be a string")
    .trim()
    .min(2, "name must be at least 2 characters")
    .max(100, "name must be less than 100 characters"),
  email,
  // bcrypt only uses the first 72 bytes, so cap it to avoid silent truncation
  password: z
    .string("password should be a string")
    .min(8, "password must be at least 8 characters")
    .max(72, "password must be less than 72 characters"),
  imageUrl: z
    .url({ protocol: /^https?$/, error: "imageUrl must be a valid URL" })
    .max(2048, "imageUrl must be less than 2048 characters")
    .optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
