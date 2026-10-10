import { ApiError } from "./api.js";

export class UnauthenticationError extends ApiError {
  constructor(message: string) {
    super(401, message, true);
  }
}
