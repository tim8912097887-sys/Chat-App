import { RefreshTokenInput, TokenPayload } from '../../domain/auth/util/token-validator.ts';

declare global {
  namespace Express {
    interface Request {
      /** Populated by the refresh-token middleware. */
      refreshToken?: RefreshTokenInput;
      /** Populated by the access-token middleware. */
      accessToken?: TokenPayload;
    }
  }
}

export {};
