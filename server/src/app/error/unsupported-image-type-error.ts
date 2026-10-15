import { ApiError } from './api.js';

export class UnSupportedImageTypeError extends ApiError {
  constructor(message: string) {
    super(415, message, true);
  }
}
