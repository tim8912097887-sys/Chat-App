import pino from "pino";

import { config } from "../env/index.js";

export const logger = pino({
  level: config.logger.level,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
      "*.password",
      "*.passwordHash",
    ],
    censor: "[REDACTED]",
  },
  ...(config.isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, singleLine: true },
        },
      }),
});

export type Logger = typeof logger;
