import { z } from "zod";

const email = z
  .string("email should be a string")
  .trim()
  .toLowerCase()
  .pipe(z.email("email is invalid").max(254, "email is too long"));

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const optionalImage = z.preprocess((value) => {
  if (typeof FileList !== "undefined" && value instanceof FileList) {
    return value.length > 0 ? value.item(0) : undefined;
  }

  return value;
}, z.file().max(MAX_IMAGE_SIZE, "Image must be 5 MB or smaller.").mime(ALLOWED_IMAGE_TYPES, "Only PNG, JPEG, and WebP images are allowed.").optional());

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
  image: optionalImage,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type SignupFormInput = z.input<typeof signupSchema>;
