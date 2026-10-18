import { DomainError } from '../../error/domain.js';

export class InvalidUserTokenError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
