import { RefreshTokenInput } from "../../domain/auth/util/token-validator.ts";

declare global {
  namespace Express {
    interface Request {
      /** Populated by the refresh-token middleware. */
      refreshToken?: RefreshTokenInput;
    }
  }
}

export {};
