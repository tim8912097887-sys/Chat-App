import { compare, hash } from "bcrypt-ts";

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, passwordHash: string): Promise<boolean>;
}

export const hashPassword = (
  password: string,
  cost: number,
): Promise<string> => hash(password, cost);

export const verifyPassword = (
  password: string,
  passwordHash: string,
): Promise<boolean> => compare(password, passwordHash);

export const createPasswordHasher = (cost: number): PasswordHasher => ({
  hash: (password) => hashPassword(password, cost),
  verify: verifyPassword,
});