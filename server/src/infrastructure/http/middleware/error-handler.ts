import { type ErrorRequestHandler } from "express";
import { ApiError } from "../../../app/error/api.js";
import { DomainError } from "../../../domain/error/domain.js";
import { mapDomainErrorToApiError } from "../util/error-mapping.js";
import { logger } from "../../../config/logger/logger.js";
import { errorResponse } from "../../../shared/http/error.js";
import { ERROR_CODE, ERROR_STATUS } from "../../../shared/http/constants.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Variables for data envelope
  let statusCode = ERROR_STATUS.SERVER_ERROR;
  let statusType = ERROR_CODE.SERVER_ERROR;
  let detail = "An unexpected error occurred. Please try again later.";

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    statusType = err.type;
    detail = err.message;
  }

  if (err instanceof DomainError) {
    const apiError = mapDomainErrorToApiError(err);
    if (apiError) {
      statusCode = apiError.statusCode;
      statusType = apiError.type;
      detail = apiError.message;
    }
  }
  // Log useful context
  const logContext = {
    method: req.method,
    path: req.path,
    type: statusType,
    ip: req.ip,
    stack: statusCode === 500 ? err.stack : undefined, // Only log stacks for 500s
  };

  if (statusCode >= 500) {
    logger.error(logContext, `[CRITICAL] ${err.message}`);
  } else {
    logger.warn(logContext, `[CLIENT_ERROR] ${detail}`);
  }

  // Uniform Response Structure
  return res
    .status(statusCode)
    .json(errorResponse({ code: statusType, detail }));
};
