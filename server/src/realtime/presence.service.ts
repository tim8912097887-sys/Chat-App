import { RelationshipRepository } from '../domain/relationship/relationship.repository.js';
import { userRoom } from './realtime.utils.js';
import { FRIEND_OFFLINE_EVENT, FRIEND_ONLINE_EVENT } from './realtime.constants.js';
import { Server } from 'socket.io';
import { createRealtimeEvent } from './realtime.types.js';

interface PresenceServiceDependencies {
  relationshipRepository: RelationshipRepository;
}

export class PresenceService {
  constructor(private readonly deps: PresenceServiceDependencies) {}

  private io?: Server;

  attach(io: Server): void {
    if (this.io) {
      throw new Error('Socket.IO server is already attached');
    }

    this.io = io;
  }

  private requireServer(): Server {
    if (!this.io) {
      throw new Error('Socket.IO server has not been attached');
    }

    return this.io;
  }

  async onConnected(userId: string): Promise<void> {
    // Check whether this user already has another live socket.
    const existingSockets = await this.requireServer().in(userRoom(userId)).fetchSockets();

    // The connection handler must join the user room first.
    const isFirstSocket = existingSockets.length <= 1;

    if (isFirstSocket) {
      await this.notifyFriends(userId, 'online');
    }
  }

  async onDisconnected(userId: string): Promise<void> {
    const remainingSockets = await this.requireServer().in(userRoom(userId)).fetchSockets();

    // Another tab/device is still connected.
    if (remainingSockets.length > 0) {
      return;
    }

    await this.notifyFriends(userId, 'offline');
  }

  disconnectUser(userId: string): void {
    // Disconnect every socket belonging to this user.
    this.requireServer().in(userRoom(userId)).disconnectSockets(true);
  }

  private async notifyFriends(userId: string, status: 'online' | 'offline'): Promise<void> {
    const friendships = await this.deps.relationshipRepository.findFriendsByUserId(userId);

    const friendIds = [
      ...new Set(
        friendships.flatMap((friendship) =>
          friendship.userIds.filter((id) => id.toString() !== userId),
        ),
      ),
    ];

    // Prevent broadcast to everyone when empty array
    if (friendIds.length === 0) {
      return;
    }

    const event = status === 'online' ? FRIEND_ONLINE_EVENT : FRIEND_OFFLINE_EVENT;
    const rooms = friendIds.map(userRoom);
    this.requireServer().to(rooms).emit(
      'realtime:event',
      createRealtimeEvent(event, {
        userId,
      }),
    );
  }
}
