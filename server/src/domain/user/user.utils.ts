import { randomInt } from "node:crypto";
import { SEARCH_CODE_ALPHABET, SEARCH_CODE_LENGTH } from "./user.constants.js";

export const isDuplicateKeyError = (err: unknown): boolean =>
  typeof err === "object" &&
  err !== null &&
  "code" in err &&
  err.code === 11000;

export const generateSearchCode = (): string =>
  Array.from(
    { length: SEARCH_CODE_LENGTH },
    () => SEARCH_CODE_ALPHABET[randomInt(SEARCH_CODE_ALPHABET.length)],
  ).join("");
