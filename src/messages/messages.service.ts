import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService, Message } from '../config';
import { pusherServer } from '../config/pusher.config';
import { ConversationsService } from '../conversations/conversations.service';
import { PushService } from '../config/push.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private supabase: SupabaseService,
    private conversationsService: ConversationsService,
    private pushService: PushService,
    private usersService: UsersService,
  ) {}

  async findByConversation(conversationId: string): Promise<any[]> {
    const messages = await this.supabase.findMessagesByConversation(conversationId);
    return messages.map(this.toCamelCase);
  }

  async createMessage(
    conversationId: string,
    senderId: string,
    senderName: string,
    content: string,
    type: 'text' | 'image' = 'text'
  ): Promise<any> {
    const message = await this.supabase.createMessage({
      conversation_id: conversationId,
      sender_id: senderId,
      sender_name: senderName,
      content,
      type,
    });

    // Update conversation last message
    await this.conversationsService.updateLastMessage(
      conversationId,
      content,
      message.created_at,
      senderId,
      senderName,
    );

    // Trigger Pusher notifications
    try {
      await pusherServer.trigger('chat', 'newMessage', {
        id: message.id,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        senderName: message.sender_name,
        content: message.content,
        type: message.type,
        createdAt: message.created_at,
      });

      await pusherServer.trigger('chat', 'conversationUpdate', {
        conversationId: message.conversation_id,
        lastMessage: message.content,
        lastMessageTime: message.created_at,
        lastSenderId: message.sender_id,
        lastSenderName: message.sender_name,
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

    this.logger.log(`Message created: ${message.id}`);
    return this.toCamelCase(message);
  }

  async create(
    conversationId: string,
    senderId: string,
    content: string,
    type: 'text' | 'image' = 'text'
  ): Promise<Message> {
    return this.createMessage(conversationId, senderId, 'Unknown Sender', content, type);
  }

  async markAsRead(messageId: string): Promise<void> {
    await this.supabase.markMessageAsRead(messageId);
  }

  async upsertMessage(message: Message): Promise<Message> {
    const upserted = await this.supabase.upsertMessage({
      id: message.id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      sender_name: message.sender_name || 'Unknown Sender',
      content: message.content,
      type: message.type,
      created_at: message.created_at,
      read_at: message.read_at,
    });

    // Update conversation last message
    await this.conversationsService.updateLastMessage(
      upserted.conversation_id,
      upserted.content,
      upserted.created_at,
      upserted.sender_id,
      upserted.sender_name,
    );

    // Trigger Pusher notifications
    try {
      await pusherServer.trigger('chat', 'newMessage', {
        id: upserted.id,
        conversation_id: upserted.conversation_id,
        sender_id: upserted.sender_id,
        sender_name: upserted.sender_name,
        content: upserted.content,
        type: upserted.type,
        created_at: upserted.created_at,
      });

      await pusherServer.trigger('chat', 'conversationUpdate', {
        conversation_id: upserted.conversation_id,
        last_message: upserted.content,
        last_message_time: upserted.created_at,
        last_sender_id: upserted.sender_id,
        last_sender_name: upserted.sender_name,
      });

      this.logger.log(`Pusher triggered for message: ${upserted.id}`);
    } catch (pusherError) {
      this.logger.error(`Pusher trigger error: ${pusherError}`);
    }

    // Send push notification
    this.sendPushNotification(
      upserted.conversation_id,
      upserted.sender_id,
      upserted.sender_name,
      upserted.content,
    );

    this.logger.log(`Message upserted: ${upserted.id}`);
    return this.toCamelCase(upserted);
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
        const playerId = (user as any)?.player_id;

        if (playerId) {
          const conversation = await this.conversationsService.findById(conversationId);
          const title = conversation?.name || senderName;
          const message = `${senderName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`;

          await this.pushService.sendNotification({
            playerId,
            title,
            message,
            data: {
              conversation_id: conversationId,
              sender_id: senderId,
              message_id: conversationId,
            },
          });
        }
      }
    } catch (error) {
      this.logger.error(`Push notification error: ${error}`);
    }
  }

  private mapToMessage(msg: any): Message {
    return {
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      sender_name: msg.sender_name,
      content: msg.content,
      type: msg.type,
      created_at: msg.created_at,
      read_at: msg.read_at,
    };
  }

  private toCamelCase(msg: any): any {
    return {
      id: msg.id,
      conversationId: msg.conversation_id,
      senderId: msg.sender_id,
      senderName: msg.sender_name,
      content: msg.content,
      type: msg.type,
      createdAt: msg.created_at,
      readAt: msg.read_at,
    };
  }
}
