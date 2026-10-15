import { ApiError } from '../../../app/error/api.js';
import { BadRequestError } from '../../../app/error/bad-request.js';
import { ServerConflictError } from '../../../app/error/server-conflict.js';
import { UnauthenticationError } from '../../../app/error/unauthentication.js';
import { InvalidCredentialError } from '../../../domain/auth/error/invalid-credential.js';
import { InvalidImageError } from '../../../domain/auth/error/invalid-image.js';
import { InvalidTokenError } from '../../../domain/auth/error/invalid-token.js';
import { LoginLockedError } from '../../../domain/auth/error/login-locked.js';
import { DomainError } from '../../../domain/error/domain.js';

export const mapDomainErrorToApiError = (error: DomainError): ApiError | undefined => {
  if (error instanceof InvalidTokenError) {
    return new UnauthenticationError(error.message);
  } else if (error instanceof InvalidCredentialError) {
    return new BadRequestError(error.message);
  } else if (error instanceof LoginLockedError) {
    return new ServerConflictError(error.message);
  } else if (error instanceof InvalidImageError) {
    return new BadRequestError(error.message);
  } else {
    return undefined;
  }
};
