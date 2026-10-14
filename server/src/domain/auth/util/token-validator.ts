import { SignJWT, jwtVerify } from 'jose';

export type TokenType = 'access' | 'refresh';

export interface TokenPayload {
  userId: string;
  tokenVersion: number;
}

export interface RefreshTokenInput extends TokenPayload {
  refreshToken: string;
}

export interface TokenServiceOptions {
  issuer: string;
  accessSecret: string;
  refreshSecret: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
}

export interface TokenService {
  signAccessToken(payload: TokenPayload): Promise<string>;
  signRefreshToken(payload: TokenPayload): Promise<string>;
  /** Returns the payload, or null when the token is malformed, expired or has a bad signature. */
  verifyAccessToken(token: string): Promise<TokenPayload | null>;
  verifyRefreshToken(token: string): Promise<TokenPayload | null>;
}

export class JoseTokenService implements TokenService {
  private readonly accessKey: Uint8Array;
  private readonly refreshKey: Uint8Array;

  constructor(private readonly options: TokenServiceOptions) {
    const encoder = new TextEncoder();
    this.accessKey = encoder.encode(options.accessSecret);
    this.refreshKey = encoder.encode(options.refreshSecret);
  }

  signAccessToken(payload: TokenPayload): Promise<string> {
    return this.sign('access', payload, this.accessKey, this.options.accessTtlSeconds);
  }

  signRefreshToken(payload: TokenPayload): Promise<string> {
    return this.sign('refresh', payload, this.refreshKey, this.options.refreshTtlSeconds);
  }

  verifyAccessToken(token: string): Promise<RefreshTokenInput | null> {
    return this.verify('access', token, this.accessKey);
  }

  verifyRefreshToken(token: string): Promise<RefreshTokenInput | null> {
    return this.verify('refresh', token, this.refreshKey);
  }

  private sign(
    type: TokenType,
    payload: TokenPayload,
    key: Uint8Array,
    ttlSeconds: number,
  ): Promise<string> {
    const jwt = new SignJWT({ ver: payload.tokenVersion, typ: type })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(payload.userId)
      .setIssuer(this.options.issuer)
      .setIssuedAt()
      .setExpirationTime(`${ttlSeconds}s`);
    if (type === 'refresh') {
      jwt.setJti(crypto.randomUUID());
    }
    return jwt.sign(key);
  }

  private async verify(
    type: TokenType,
    token: string,
    key: Uint8Array,
  ): Promise<RefreshTokenInput | null> {
    try {
      const { payload } = await jwtVerify(token, key, {
        issuer: this.options.issuer,
        algorithms: ['HS256'],
      });
      if (payload.typ !== type) return null;
      if (typeof payload.sub !== 'string' || typeof payload.ver !== 'number') return null;
      return {
        refreshToken: token,
        userId: payload.sub,
        tokenVersion: payload.ver,
      };
    } catch {
      return null;
    }
  }
}
