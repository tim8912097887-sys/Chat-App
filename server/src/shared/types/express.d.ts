import type { TokenPayload } from "../../infrastructure/security/token.service";

declare global {
  namespace Express {
    interface Request {
      /** Populated by the refresh-token middleware. */
      refreshToken?: TokenPayload;
    }
  }
}

export {};
