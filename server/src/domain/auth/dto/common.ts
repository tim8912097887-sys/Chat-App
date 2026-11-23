import { AuthenticatedUser } from '../../user/user.types.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthDto {
  tokens: AuthTokens;
  user: AuthenticatedUser;
}

export interface LoginResponseDto {
  accessToken: string;
  user: AuthenticatedUser;
}
