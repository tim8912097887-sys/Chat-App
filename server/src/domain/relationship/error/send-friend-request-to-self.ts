import { DomainError } from '../../error/domain.js';

export class SendFriendRequestToSelfError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
