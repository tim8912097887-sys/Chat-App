import { createServer, type Server as HttpServer } from 'http';
import type { Server as SocketServer } from 'socket.io';
import { config } from './config/env/index.js';
import { logger } from './config/logger/logger.js';
import { shutdown, subscribeShutdown } from './infrastructure/lifecycle/shutdown.js';
import { createApp } from './app.js';
import { dbConnection } from './infrastructure/persistence/db.js';
import { buildContainer } from './container.js';
import { SocketIoRealtimeEventPublisher } from './realtime/socket-io-realtime-event-publisher.js';
import { createSocketServer } from './realtime/socket-server.js';

class AppServer {
  private static instance: AppServer;
  private httpServer?: HttpServer;
  // Prevent multiple shutdown process
  private isShutdown = false;
  private io?: SocketServer;
  private timeout = 10000;
  // Private constructor prevents direct "new AppServer()" calls
  private constructor() {
    this.setupProcessHandlers();
  }

  public static getInstance(): AppServer {
    if (!AppServer.instance) {
      AppServer.instance = new AppServer();
    }
    return AppServer.instance;
  }

  public async start(): Promise<void> {
    try {
      await dbConnection();
      const realtimeEvents = new SocketIoRealtimeEventPublisher();
      const container = buildContainer(realtimeEvents);
      const app = createApp(container);
      this.httpServer = createServer(app);

      this.io = createSocketServer({
        httpServer: this.httpServer,
        config,
        tokenService: container.tokenService,
        userRepository: container.user.userRepository,
        presenceService: container.presenceService,
      });

      realtimeEvents.attach(this.io);
      container.presenceService.attach(this.io);

      await new Promise<void>((resolve, reject) => {
        this.httpServer!.once('error', reject);

        this.httpServer!.listen(config.port, () => {
          this.httpServer!.off('error', reject);
          logger.info(`Server listening on port ${config.port}`);
          resolve();
        });
      });
      subscribeShutdown(() => this.disConnectServer());
      logger.info(`Server initialization: Successfully register shutdown`);
    } catch (error: any) {
      logger.error(`Server Initialization: Server fail to start,Error: ${error}`);
      process.exit(1);
    }
  }

  private setupProcessHandlers(): void {
    const exitSignals = ['SIGINT', 'SIGTERM', 'uncaughtException', 'unhandledRejection'];
    exitSignals.forEach((signal: string) => {
      process.on(signal, (reason) => this.gracefulShutdown(signal, reason));
    });
  }

  private async gracefulShutdown(signal: string, reason?: any): Promise<void> {
    if (this.isShutdown) return;
    this.isShutdown = true;

    logger.info(`\n${signal} received. Starting graceful shutdown...`);

    if (reason && (signal === 'uncaughtException' || signal === 'unhandledRejection')) {
      logger.error(`Reason: ${reason}`);
    }
    // Force exit after a timeout to prevent hanging
    const forceExit = setTimeout(() => {
      logger.error('Shutdown timed out. Forcing exit.');
      process.exit(1);
    }, this.timeout);

    try {
      await shutdown();
      logger.info('Shutdown complete. Goodbye!');
      clearTimeout(forceExit);
      process.exit(0);
    } catch (err) {
      logger.error(err, 'Error during shutdown:');
      process.exit(1);
    }
  }
  private async disConnectServer() {
    // Socket.IO close also closes its attached HTTP server.
    if (this.io) {
      await this.io.close((error?: Error) => {
        if (error) {
          logger.error({ error }, 'Websocket closed fail');
        }
      });

      this.io = undefined;
      this.httpServer = undefined;
      return;
    }

    if (this.httpServer?.listening) {
      await new Promise<void>((resolve, reject) => {
        this.httpServer?.close((error) => {
          if (error) {
            logger.error({ error }, 'server close error');
            reject(error);
          } else resolve();
        });
      });
    }

    this.httpServer = undefined;
  }
}

const server = AppServer.getInstance();
await server.start();
