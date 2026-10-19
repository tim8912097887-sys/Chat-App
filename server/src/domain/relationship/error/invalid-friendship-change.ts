import { DomainError } from '../../error/domain.js';

export class InvalidFriendshipChangeError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
