import { DomainError } from '../../shared/error.js';

export class RoleUnchangedError extends DomainError {
  constructor(message = 'Member already has the specified role') {
    super(message);
  }
}

export class InsufficientConversationRoleError extends DomainError {
  constructor(message = 'Insufficient role permissions for this conversation') {
    super(message);
  }
}

export class CannotChangeOwnerRoleError extends DomainError {
  constructor(message = 'Cannot change the role of the conversation owner') {
    super(message);
  }
}

export class CannotKickHigherOrEqualRoleError extends DomainError {
  constructor(message = 'You do not have permission to kick a member with a higher or equal role') {
    super(message);
  }
}
