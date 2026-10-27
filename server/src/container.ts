import { createUserContainer, UserContainer } from './domain/user/user.container.js';
import { AuthContainer, createAuthContainer } from './domain/auth/auth.container.js';
import { JoseTokenService, TokenService } from './domain/auth/util/token-validator.js';
import { config } from './config/env/index.js';
import { createPasswordHasher } from './domain/auth/util/password-hasher.js';
import {
  createRelationshipContainer,
  RelationshipContainer,
} from './domain/relationship/relationship.container.js';
import { RealtimeEventPublisher } from './realtime/realtime-event-publisher.js';
import { PresenceService } from './realtime/presence.service.js';

export interface AppContainer {
  user: UserContainer;
  auth: AuthContainer;
  relationship: RelationshipContainer;
  tokenService: TokenService;
  presenceService: PresenceService;
}

export const buildContainer = (realtimeEvents: RealtimeEventPublisher): AppContainer => {
  const passwordHasher = createPasswordHasher(config.password.bcryptCost);
  const tokenService = new JoseTokenService(config.jwt);

  const user = createUserContainer({ tokenService, realtimeEvents });

  const relationship = createRelationshipContainer({
    userRepository: user.userRepository,
    tokenService,
    realtimeEvents,
  });

  const presenceService = new PresenceService({
    relationshipRepository: relationship.relationshipRepository,
  });

  const auth = createAuthContainer({
    config,
    userService: user.userService,
    tokenService,
    passwordHasher,
    presenceService,
  });

  return { user, auth, relationship, tokenService, presenceService };
};
