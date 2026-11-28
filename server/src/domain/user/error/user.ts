import { DomainError } from '../../shared/error.js';

export class UserNotActiveError extends DomainError {
  constructor(userId: string) {
    super(`User ${userId} is not active`);
  }
}

export class UserNotExistError extends DomainError {
  constructor(userId: string) {
    super(`User ${userId} does not exist`);
  }
}
