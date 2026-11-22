import { DomainError } from '../../error/domain.js';

export class UserNotExistError extends DomainError {
  constructor(userId: string) {
    super(`User ${userId} does not exist`);
  }
}
