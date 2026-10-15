import { env } from './env.js';

const isProduction = env.NODE_ENV === 'production';

export const config = {
  env: env.NODE_ENV,
  isProduction,
  port: env.PORT,
  cors: {
    origins: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
  },
  logger: { level: env.LOG_LEVEL },
  database: { url: env.DATABASE_URL },
  jwt: {
    issuer: env.JWT_ISSUER,
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
    refreshTtlSeconds: env.REFRESH_TOKEN_TTL_SECONDS,
  },
  password: { bcryptCost: env.BCRYPT_COST },
  auth: {
    maxLoginAttempts: 3,
    lockDurationMs: 15 * 60 * 1000,
    refreshCookieName: 'refresh_token',
    refreshCookiePath: '/api/v1/auth',
  },
  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  },
} as const;

export type AppConfig = typeof config;
