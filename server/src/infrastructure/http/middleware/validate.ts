import type { RequestHandler } from "express";
import type { z } from "zod";
import { BadRequestError } from "../../../app/error/bad-request.js";

export const validateBody =
  <S extends z.ZodType>(schema: S): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const detail = result.error.issues
        .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
        .join("; ");
      throw new BadRequestError(detail);
    }
    req.body = result.data;
    next();
  };
