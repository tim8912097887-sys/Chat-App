import { createUserContainer, UserContainer } from './domain/user/user.container.js';
import { AuthContainer, createAuthContainer } from './domain/auth/auth.container.js';
import { JoseTokenService } from './domain/auth/util/token-validator.js';
import { config } from './config/env/index.js';
import { createPasswordHasher } from './domain/auth/util/password-hasher.js';
import {
  createRelationshipContainer,
  RelationshipContainer,
} from './domain/relationship/relationship.container.js';

export interface AppContainer {
  user: UserContainer;
  auth: AuthContainer;
  relationship: RelationshipContainer;
}

/** Composition root: the only place where concrete implementations are wired together. */
export const buildContainer = (): AppContainer => {
  const passwordHasher = createPasswordHasher(config.password.bcryptCost);
  const tokenService = new JoseTokenService(config.jwt);

  const user = createUserContainer({
    tokenService,
  });
  const auth = createAuthContainer({
    config,
    userService: user.userService,
    tokenService,
    passwordHasher,
  });
  const relationship = createRelationshipContainer({
    userRepository: user.userRepository,
    tokenService,
  });

  return { user, auth, relationship };
};
