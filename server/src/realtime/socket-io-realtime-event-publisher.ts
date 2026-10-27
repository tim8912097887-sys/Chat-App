import type { Server } from 'socket.io';
import { RealtimeEventPublisher } from './realtime-event-publisher.js';
import { RealtimeEvent } from './realtime.types.js';
import { userRoom } from './realtime.utils.js';

export class SocketIoRealtimeEventPublisher implements RealtimeEventPublisher {
  private io?: Server;

  attach(io: Server): void {
    if (this.io) {
      throw new Error('Socket.IO server is already attached');
    }

    this.io = io;
  }

  publishToUser(userId: string, event: RealtimeEvent): void {
    this.requireServer().to(userRoom(userId)).emit('realtime:event', event);
  }

  publishToUsers(userIds: string[], event: RealtimeEvent): void {
    if (userIds.length === 0) return;

    const rooms = userIds.map(userRoom);
    this.requireServer().to(rooms).emit('realtime:event', event);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const sockets = await this.requireServer().in(userRoom(userId)).fetchSockets();

    return sockets.length > 0;
  }

  private requireServer(): Server {
    if (!this.io) {
      throw new Error('Socket.IO server has not been attached');
    }

    return this.io;
  }
}
