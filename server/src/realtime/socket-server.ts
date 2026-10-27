import type { Server as HttpServer } from 'node:http';
import { Server, type DefaultEventsMap } from 'socket.io';
import { AppConfig } from '../config/env/index.js';
import { TokenService } from '../domain/auth/util/token-validator.js';
import { UserRepository } from '../domain/user/user.repository.js';
import { createSocketAuthMiddleware } from '../infrastructure/http/middleware/websocket.js';
import { logger } from '../config/logger/logger.js';
import { userRoom } from './realtime.utils.js';
import { AuthenticatedSocketData } from './realtime.types.js';
import { PresenceService } from './presence.service.js';

export function createSocketServer(deps: {
  httpServer: HttpServer;
  config: AppConfig;
  tokenService: TokenService;
  userRepository: UserRepository;
  presenceService: PresenceService;
}) {
  const { httpServer, config, tokenService, userRepository, presenceService } = deps;

  const io = new Server<
    DefaultEventsMap,
    DefaultEventsMap,
    DefaultEventsMap,
    AuthenticatedSocketData
  >(httpServer, {
    cors: {
      origin: config.cors.origins,
      credentials: true,
    },
    // Set limits appropriate to the event payloads your app supports.
    maxHttpBufferSize: 1e6,
    connectTimeout: 10_000,
  });

  io.use(createSocketAuthMiddleware({ tokenService, userRepository }));

  io.on('connection', async (socket) => {
    const { userId } = socket.data.user;

    // Never accept a client-supplied userId for room membership.
    await socket.join(userRoom(userId));
    await presenceService.onConnected(userId);

    socket.on('error', (error) => {
      logger.error(
        {
          socketId: socket.id,
          userId,
          message: error.message,
        },
        'Socket error',
      );
    });

    socket.on('disconnect', async () => {
      await presenceService.onDisconnected(userId);
    });
  });

  return io;
}
