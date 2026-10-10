import {
  createUserContainer,
  UserContainer,
} from "./domain/user/user.container.js";
import {
  AuthContainer,
  createAuthContainer,
} from "./domain/auth/auth.container.js";
import { JoseTokenService } from "./domain/auth/util/token-validator.js";
import { config } from "./config/env/index.js";
import { createPasswordHasher } from "./domain/auth/util/password-hasher.js";

export interface AppContainer {
  user: UserContainer;
  auth: AuthContainer;
}

/** Composition root: the only place where concrete implementations are wired together. */
export const buildContainer = (): AppContainer => {
  const passwordHasher = createPasswordHasher(config.password.bcryptCost);
  const tokenService = new JoseTokenService(config.jwt);

  const user = createUserContainer();
  const auth = createAuthContainer({
    config,
    userService: user.userService,
    tokenService,
    passwordHasher,
  });

  return { user, auth };
};
