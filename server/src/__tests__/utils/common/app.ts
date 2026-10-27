import request from 'supertest';
import { Server } from 'socket.io';
import { createApp } from '../../../app.js';
import { buildContainer } from '../../../container.js';
import { vitest } from 'vitest';

export const mockedRealtimePublisher = {
  publishToUser: vitest.fn(),
  publishToUsers: vitest.fn(),
  isUserOnline: vitest.fn().mockResolvedValue(true),
};
const container = buildContainer(mockedRealtimePublisher);
container.presenceService.attach(new Server());
const app = createApp(container);

export const api = (): ReturnType<typeof request> => request(app);
