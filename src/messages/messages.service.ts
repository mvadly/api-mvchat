import { Injectable, Logger } from '@nestjs/common';
import { GoogleSheetsService } from '../config';
import { Message } from '../common/interfaces';
import { pusherServer } from '../config/pusher.config';
import { ConversationsService } from '../conversations/conversations.service';
import { PushService } from '../config/push.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);
  private readonly MESSAGES_SHEET = 'Messages';
  private messages: Map<string, Message[]> = new Map();

  constructor(
    private googleSheets: GoogleSheetsService,
    private conversationsService: ConversationsService,
    private pushService: PushService,
    private usersService: UsersService,
  ) {
    this.loadFromSheet();
  }

  private async loadFromSheet() {
    const data = await this.googleSheets.getValues(this.MESSAGES_SHEET);
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.length >= 7) {
        const message: Message = {
          id: row[0],
          conversationId: row[1],
          senderId: row[2],
          senderName: row[3] || 'Unknown Sender',
          content: row[4],
          type: row[5] as 'text' | 'image',
          createdAt: row[6],
          readAt: row[7] || undefined,
        };
        if (!this.messages.has(message.conversationId)) {
          this.messages.set(message.conversationId, []);
        }
        this.messages.get(message.conversationId)!.push(message);
      }
    }
    this.logger.log(`Loaded ${this.messages.size} conversations with messages`);
  }

  async findByConversation(conversationId: string): Promise<Message[]> {
    const data = this.messages.get(conversationId);
    return data || [];
  }

  async createMessage(conversationId: string, senderId: string, senderName: string, content: string, type: 'text' | 'image' = 'text'): Promise<Message> {
    const id = this.generateId();
    const createdAt = new Date().toISOString();

    const message: Message = { id, conversationId, senderId, senderName, content, type, createdAt };

    if (!this.messages.has(conversationId)) {
      this.messages.set(conversationId, []);
    }
    this.messages.get(conversationId)!.push(message);

    await this.googleSheets.appendValues(`${this.MESSAGES_SHEET}!A${(await this.getNextRow())}:H`, [[id, conversationId, senderId, senderName, content, type, createdAt, '']]);

    // Update conversation last message
    await this.conversationsService.updateLastMessage(
      conversationId,
      content,
      createdAt,
      senderId,
      senderName,
    );

    // Trigger Pusher notifications
    try {
      await pusherServer.trigger('chat', 'newMessage', {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderName: message.senderName,
        content: message.content,
        type: message.type,
        createdAt: message.createdAt,
      });

      await pusherServer.trigger('chat', 'conversationUpdate', {
        conversationId: message.conversationId,
        lastMessage: message.content,
        lastMessageTime: message.createdAt,
        lastSenderId: message.senderId,
        lastSenderName: message.senderName,
      });

      this.logger.log(`Pusher triggered for message: ${message.id}`);
    } catch (pusherError) {
      this.logger.error(`Pusher trigger error: ${pusherError}`);
    }

    // Send push notification to conversation members (except sender)
    this.sendPushNotification(
      conversationId,
      senderId,
      senderName,
      content,
    );

    this.logger.log(`Message created: ${id}`);
    return message;
  }

  async create(conversationId: string, senderId: string, content: string, type: 'text' | 'image' = 'text'): Promise<Message> {
    return this.createMessage(conversationId, senderId, 'Unknown Sender', content, type);
  }

  async markAsRead(messageId: string): Promise<void> {
    for (const [convId, messages] of this.messages.entries()) {
      const msg = messages.find(m => m.id === messageId);
      if (msg) {
        msg.readAt = new Date().toISOString();
        break;
      }
    }
  }

  async upsertMessage(message: Message): Promise<Message> {
    console.log('Upserting message:', message);
    for (const [convId, messages] of this.messages.entries()) {
      const existingIndex = messages.findIndex(m => m.id === message.id);
      if (existingIndex !== -1) {
        messages[existingIndex] = message;
        await this.updateRow(message);
        this.logger.log(`Message updated: ${message.id}`);
        return message;
      }
    }
    if (!this.messages.has(message.conversationId)) {
      this.messages.set(message.conversationId, []);
    }
    this.messages.get(message.conversationId)!.push(message);
    await this.googleSheets.appendValues(
      `${this.MESSAGES_SHEET}!A${(await this.getNextRow())}:H`,
      [[message.id, message.conversationId, message.senderId, message.senderName || 'Unknown Sender', message.content, message.type, message.createdAt, message.readAt || '']]
    );
    this.logger.log(`Message upserted: ${message.id}`);
    
    // Update conversation last message
    await this.conversationsService.updateLastMessage(
      message.conversationId,
      message.content,
      message.createdAt,
      message.senderId,
      message.senderName || 'Unknown Sender',
    );
    
    // Trigger Pusher notifications
    try {
      await pusherServer.trigger('chat', 'newMessage', {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderName: message.senderName || 'Unknown Sender',
        content: message.content,
        type: message.type,
        createdAt: message.createdAt,
      });

      await pusherServer.trigger('chat', 'conversationUpdate', {
        conversationId: message.conversationId,
        lastMessage: message.content,
        lastMessageTime: message.createdAt,
        lastSenderId: message.senderId,
        lastSenderName: message.senderName || 'Unknown Sender',
      });

      this.logger.log(`Pusher triggered for message: ${message.id}`);
    } catch (pusherError) {
      this.logger.error(`Pusher trigger error: ${pusherError}`);
    }
    
    // Send push notification to conversation members (except sender)
    this.sendPushNotification(
      message.conversationId,
      message.senderId,
      message.senderName || 'Unknown Sender',
      message.content,
    );
    
    return message;
  }

  private async updateRow(message: Message): Promise<void> {
    const data = await this.googleSheets.getValues(this.MESSAGES_SHEET);
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === message.id) {
        const row = i + 1;
        await this.googleSheets.updateValues(
          `${this.MESSAGES_SHEET}!A${row}:H`,
          [[message.id, message.conversationId, message.senderId, message.senderName || 'Unknown Sender', message.content, message.type, message.createdAt, message.readAt || '']]
        );
        return;
      }
    }
  }

  private generateId(): string {
    return 'msg_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private async sendPushNotification(
    conversationId: string,
    senderId: string,
    senderName: string,
    content: string,
  ): Promise<void> {
    try {
      const members = await this.conversationsService.getMembers(conversationId);
      const receivers = members.filter((m) => m !== senderId);

      for (const receiverId of receivers) {
        const user = await this.usersService.findById(receiverId);
        const playerId = (user as any)?.playerId;

        if (playerId) {
          const conversation = await this.conversationsService.findById(conversationId);
          const title = conversation?.name || senderName;
          const message = `${senderName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`;

          await this.pushService.sendNotification({
            playerId,
            title,
            message,
            data: {
              conversationId,
              senderId,
              messageId: conversationId,
            },
          });
        }
      }
    } catch (error) {
      this.logger.error(`Push notification error: ${error}`);
    }
  }

  private async getNextRow(): Promise<number> {
    const data = await this.googleSheets.getValues(this.MESSAGES_SHEET);
    return data.length + 1;
  }
}