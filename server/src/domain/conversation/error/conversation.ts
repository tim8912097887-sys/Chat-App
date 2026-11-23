import { DomainError } from '../../shared/error.js';

export class ConversationNotFoundError extends DomainError {
  constructor(message = 'Conversation not found') {
    super(message);
  }
}

export class ConversationDeletedError extends DomainError {
  constructor(message = 'Conversation has been deleted') {
    super(message);
  }
}

export class DirectConversationActionNotAllowedError extends DomainError {
  constructor(message = 'This action is not allowed on direct conversations') {
    super(message);
  }
}

export class CannotCreateDirectConversationWithSelfError extends DomainError {
  constructor(message = 'Cannot create a direct conversation with yourself') {
    super(message);
  }
}
