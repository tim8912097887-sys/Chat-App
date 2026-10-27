import { TokenService } from '../../../domain/auth/util/token-validator.js';
import { UserRepository } from '../../../domain/user/user.repository.js';
import { UnauthenticationError } from '../../../app/error/unauthentication.js';
import { AuthenticatedSocket, AuthenticatedSocketData } from '../../../realtime/realtime.types.js';

export function createSocketAuthMiddleware(deps: {
  tokenService: TokenService;
  userRepository: UserRepository;
}) {
  const { tokenService, userRepository } = deps;

  return async (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    try {
      const accessToken: unknown = socket.handshake.auth?.accessToken;

      if (typeof accessToken !== 'string' || accessToken.length === 0) {
        return next(new Error('UNAUTHORIZED'));
      }

      // Use the existing access-token verification implementation.
      const claims = await tokenService.verifyAccessToken(accessToken);

      if (!claims) {
        throw new UnauthenticationError('UNAUTHORIZED');
      }

      const user = await userRepository.findById(claims.userId);

      if (!user || user.status !== 'ACTIVE' || user.tokenVersion !== claims.tokenVersion) {
        return next(new UnauthenticationError('UNAUTHORIZED'));
      }

      socket.data.user = {
        userId: user._id.toString(),
        tokenVersion: user.tokenVersion,
      } satisfies AuthenticatedSocketData['user'];

      next();
    } catch {
      // Do not expose JWT, database, or internal verification errors.
      next(new UnauthenticationError('UNAUTHORIZED'));
    }
  };
}
