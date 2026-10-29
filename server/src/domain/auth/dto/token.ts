import { PublicUser } from '../../user/user.types.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthDto {
  tokens: AuthTokens;
  user: PublicUser;
}
