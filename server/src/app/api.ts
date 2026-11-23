export class ApiError extends Error {
  public type: string;
  public statusCode: number;
  public isOperational: boolean;

  constructor(errorCode: number, message: string, isOperational = false) {
    super(message);
    this.statusCode = errorCode;
    this.type = this.constructor.name;
    this.isOperational = isOperational;
    // Retain the property and instance name of the ApiError
    Object.setPrototypeOf(this, new.target.prototype);
    // Capture the stack trace, excluding the constructor from the trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string) {
    super(400, message, true);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string) {
    super(403, message, true);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(404, message, true);
  }
}

export class ServerConflictError extends ApiError {
  constructor(message: string) {
    super(409, message, true);
  }
}

export class UnauthenticationError extends ApiError {
  constructor(message: string) {
    super(401, message, true);
  }
}

export class UnSupportedImageTypeError extends ApiError {
  constructor(message: string) {
    super(415, message, true);
  }
}
