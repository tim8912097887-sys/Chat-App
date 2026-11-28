import { DomainError } from '../../shared/error.js';

export class MemberNotFoundError extends DomainError {
  constructor(message = 'Target user is not a member of this conversation') {
    super(message);
  }
}

export class MemberAlreadyExistsError extends DomainError {
  constructor(message = 'User is already a member of this conversation') {
    super(message);
  }
}

export class NotConversationMemberError extends DomainError {
  constructor(message = 'User is not a member of this conversation') {
    super(message);
  }
}

export class CannotInviteSelfError extends DomainError {
  constructor(message = 'You cannot invite yourself to a conversation') {
    super(message);
  }
}

export class CannotLeaveAsOwnerError extends DomainError {
  constructor(message = 'Conversation owner cannot leave the conversation') {
    super(message);
  }
}

export class CannotKickSelfError extends DomainError {
  constructor(message = 'You cannot kick yourself from a conversation') {
    super(message);
  }
}

export class CannotUpdateSelfRoleError extends DomainError {
  constructor(message = 'You cannot update role yourself in a conversation') {
    super(message);
  }
}
