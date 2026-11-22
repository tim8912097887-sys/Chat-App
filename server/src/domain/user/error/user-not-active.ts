import { DomainError } from '../../error/domain.js';

export class UserNotActiveError extends DomainError {
  constructor(userId: string) {
    super(`User ${userId} is not active`);
  }
}
