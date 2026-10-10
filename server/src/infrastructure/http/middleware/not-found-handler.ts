import { type RequestHandler } from "express";
import { errorResponse } from "../../../shared/http/error.js";
import { logger } from "../../../config/logger/logger.js";
import { ERROR_CODE, ERROR_STATUS } from "../../../shared/http/constants.js";

export const notFoundHandler: RequestHandler = (req, res) => {
  logger.warn(
    `NotFoundHandler: Ip ${req.ip} enter not found route ${req.method} ${req.url}`,
  );

  res
    .status(ERROR_STATUS.NOT_FOUND)
    .json(
      errorResponse({ code: ERROR_CODE.NOT_FOUND, detail: "Route not found" }),
    );
};
