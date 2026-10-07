import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import type { Express } from "express";
import helmet from "helmet";
import { config } from "./config/env/index.js";
import { successResponse } from "./shared/http/success.js";
import { corsConfig } from "./config/cors/cors.js";

export const createApp = (): Express => {
  const app = express();

  app.use(helmet());
  app.use(cors(corsConfig));
  app.use(express.json({ limit: "10kb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json(successResponse({ uptime: process.uptime() }));
  });

  return app;
};
