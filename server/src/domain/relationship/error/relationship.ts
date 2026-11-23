import { DomainError } from '../../shared/error.js';

export class FriendshipAlreadyExistError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidFriendshipChangeError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

export class SendFriendRequestToSelfError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

export class NotFriendError extends DomainError {
  constructor(message = 'Users must be friends to perform this action') {
    super(message);
  }
}
