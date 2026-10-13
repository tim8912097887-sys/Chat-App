import mongoose from 'mongoose';
import { logger } from '../../config/logger/logger.js';
import { config } from '../../config/env/index.js';
import { subscribeShutdown } from '../lifecycle/shutdown.js';

export const dbConnection = async () => {
  let mongoConnection: mongoose.Mongoose;
  // Handle database event
  mongoose.connection.on('error', (error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Database Connection Error: ${errorMessage}`);
  });
  mongoose.connection.on('connected', () => logger.info(`Database Connected`));
  mongoose.connection.on('disconnecting', () => logger.info(`Database is disconnecting`));
  mongoose.connection.on('reconnected', () => logger.info(`Database is reconnected`));
  const start = Date.now();
  try {
    mongoConnection = await mongoose.connect(config.database.url, {
      // Fail fast to try next server
      connectTimeoutMS: 5000,
      // Handle high traffic
      maxPoolSize: 20,
      // Prevent sudden burst of traffic
      minPoolSize: 5,
      // Speed up connection time by not search IP6
      family: 4,
      // Fail fast to reconnect
      serverSelectionTimeoutMS: 10000,
      // Prevent not connected socket be use
      maxIdleTimeMS: 60000,
      // General waiting time
      socketTimeoutMS: 45000,
      // Enhance initialize speed in production
      autoIndex: config.env === 'development',
      // Detect failure fast
      heartbeatFrequencyMS: 5000,
    });
    // Subscribe to shutdown lists
    subscribeShutdown(dbDisconnection);
    const duration = Date.now() - start;
    // Logger profile for database connection time
    logger.info(`Database connection: Successfully connect after ${duration}ms`);
    logger.info(`Database connection: Successfully register shutdown list`);
  } catch (error: any) {
    const duration = Date.now() - start;
    logger.error(`Database connection failed after ${duration}ms`);
    // Rethrow error handle by shutdown function
    logger.error(`Database Connection Error: ${error}`);
    throw error;
  }
  return mongoConnection;
};

export const dbDisconnection = async () => {
  await mongoose.connection.close();
};
