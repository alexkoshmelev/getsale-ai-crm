import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../common/prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/ws',
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);
  private userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds
  private socketUsers = new Map<string, string>(); // socketId -> userId
  private socketOrgs = new Map<string, string>(); // socketId -> organizationId

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private eventsService: EventsService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn('Connection rejected: No token');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub;
      const organizationId = payload.organizationId;

      // Store mappings
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
      this.socketUsers.set(client.id, userId);
      this.socketOrgs.set(client.id, organizationId);

      // Join organization room
      client.join(`org:${organizationId}`);

      this.logger.log(`Client connected: ${client.id} (user: ${userId}, org: ${organizationId})`);

      // Subscribe to organization events
      this.eventsService.subscribe(organizationId, (event) => {
        this.server.to(`org:${organizationId}`).emit('event', event);
      });
    } catch (error) {
      this.logger.error('Connection error', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUsers.get(client.id);
    const organizationId = this.socketOrgs.get(client.id);

    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }

    this.socketUsers.delete(client.id);
    this.socketOrgs.delete(client.id);

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:chat')
  handleJoinChat(@ConnectedSocket() client: Socket, @MessageBody() data: { chatId: string }) {
    const organizationId = this.socketOrgs.get(client.id);
    if (organizationId) {
      client.join(`chat:${data.chatId}`);
      this.logger.log(`Client ${client.id} joined chat: ${data.chatId}`);
    }
  }

  @SubscribeMessage('leave:chat')
  handleLeaveChat(@ConnectedSocket() client: Socket, @MessageBody() data: { chatId: string }) {
    client.leave(`chat:${data.chatId}`);
    this.logger.log(`Client ${client.id} left chat: ${data.chatId}`);
  }

  // Broadcast message to chat room
  broadcastMessage(chatId: string, message: any) {
    this.server.to(`chat:${chatId}`).emit('message', message);
  }

  // Broadcast event to organization
  broadcastEvent(organizationId: string, event: any) {
    this.server.to(`org:${organizationId}`).emit('event', event);
  }

  // Send notification to user
  sendNotification(userId: string, notification: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit('notification', notification);
      });
    }
  }
}

