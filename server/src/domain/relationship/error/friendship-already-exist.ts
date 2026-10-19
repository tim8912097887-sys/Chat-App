import { DomainError } from '../../error/domain.js';

export class FriendshipAlreadyExistError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
