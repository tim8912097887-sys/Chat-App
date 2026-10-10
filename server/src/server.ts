import { Server } from "http";
import { config } from "./config/env/index.js";
import { logger } from "./config/logger/logger.js";
import {
  shutdown,
  subscribeShutdown,
} from "./infrastructure/lifecycle/shutdown.js";
import { createApp } from "./app.js";
import { dbConnection } from "./infrastructure/persistence/db.js";
import { buildContainer } from "./container.js";

class AppServer {
  private static instance: AppServer;
  private server?: Server;
  // Prevent multiple shutdown process
  private isShutdown = false;
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
      const container = buildContainer();
      const app = createApp(container);
      this.server = app.listen(config.port, () => {
        logger.info(
          `Server initialization: Server start on port ${config.port}`,
        );
      });
      subscribeShutdown(() => this.disConnectServer());
      logger.info(`Server initialization: Successfully register shutdown`);
    } catch (error: any) {
      logger.error(
        `Server Initialization: Server fail to start,Error: ${error}`,
      );
      process.exit(1);
    }
  }

  private setupProcessHandlers(): void {
    const exitSignals = [
      "SIGINT",
      "SIGTERM",
      "uncaughtException",
      "unhandledRejection",
    ];
    exitSignals.forEach((signal: string) => {
      process.on(signal, (reason) => this.gracefulShutdown(signal, reason));
    });
  }

  private async gracefulShutdown(signal: string, reason?: any): Promise<void> {
    if (this.isShutdown) return;
    this.isShutdown = true;

    logger.info(`\n${signal} received. Starting graceful shutdown...`);

    if (
      reason &&
      (signal === "uncaughtException" || signal === "unhandledRejection")
    ) {
      logger.error(`Reason: ${reason}`);
    }
    // Force exit after a timeout to prevent hanging
    const forceExit = setTimeout(() => {
      logger.error("Shutdown timed out. Forcing exit.");
      process.exit(1);
    }, this.timeout);

    try {
      await shutdown();
      logger.info("Shutdown complete. Goodbye!");
      clearTimeout(forceExit);
      process.exit(0);
    } catch (err) {
      logger.error(err, "Error during shutdown:");
      process.exit(1);
    }
  }
  private async disConnectServer() {
    const serverInstance = this.server;
    // Stop accepting new requests
    if (serverInstance) {
      logger.info("Closing HTTP server...");
      await new Promise((resolve, reject) => {
        serverInstance.close((err) => (err ? reject(err) : resolve("Success")));
      });
      logger.info("HTTP server closed.");
    }
  }
}

const server = AppServer.getInstance();
await server.start();
