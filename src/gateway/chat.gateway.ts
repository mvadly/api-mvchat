import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { MessagesService } from '../messages/messages.service';
import { ConversationsService } from '../conversations/conversations.service';
import { UsersService } from '../users/users.service';

interface JoinRoomPayload {
  conversationId: string;
  userId: string;
}

interface SendMessagePayload {
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  type?: 'text' | 'image';
}

interface TypingPayload {
  conversationId: string;
  userId: string;
  userName: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(ChatGateway.name);
  private userSockets: Map<string, string> = new Map();

  constructor(
    private messagesService: MessagesService,
    private conversationsService: ConversationsService,
    private usersService: UsersService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const userId = this.getUserIdFromSocket(client.id);
    if (userId) {
      this.userSockets.delete(userId);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private getUserIdFromSocket(socketId: string): string | null {
    for (const [userId, sockId] of this.userSockets.entries()) {
      if (sockId === socketId) return userId;
    }
    return null;
  }

  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    const room = `conversation:${payload.conversationId}`;
    client.join(room);
    this.userSockets.set(payload.userId, client.id);
    this.logger.log(`User ${payload.userId} joined room ${payload.conversationId}`);
    return { success: true, room };
  }

  @SubscribeMessage('leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    const room = `conversation:${payload.conversationId}`;
    client.leave(room);
    this.logger.log(`User left room ${payload.conversationId}`);
    return { success: true };
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessagePayload,
  ) {
    const message = {
      id: 'msg_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      conversationId: payload.conversationId,
      senderId: payload.senderId,
      content: payload.content,
      type: payload.type || 'text',
      createdAt: new Date().toISOString(),
    };

    const room = `conversation:${payload.conversationId}`;
    this.server.to(room).emit('newMessage', {
      ...message,
      senderName: payload.senderName,
    });

    this.logger.log(`Message broadcast in ${payload.conversationId}: ${payload.content.substring(0, 50)}`);
    return { success: true, message };
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TypingPayload,
  ) {
    const room = `conversation:${payload.conversationId}`;
    client.to(room).emit('userTyping', {
      userId: payload.userId,
      userName: payload.userName,
    });
  }

  @SubscribeMessage('read')
  async handleRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { messageId: string },
  ) {
    await this.messagesService.markAsRead(payload.messageId);
    return { success: true };
  }

  sendMessageToUser(userId: string, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  sendMessageToConversation(conversationId: string, event: string, data: any) {
    const room = `conversation:${conversationId}`;
    this.server.to(room).emit(event, data);
  }
}