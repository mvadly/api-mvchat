import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService, Conversation, ConversationMember } from '../config';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(private supabase: SupabaseService) {}

  async findAll(): Promise<Conversation[]> {
    return this.supabase.findAllConversations();
  }

  async findById(id: string): Promise<Conversation | null> {
    return this.supabase.findConversationById(id);
  }

  async findByUserId(userId: string): Promise<Conversation[]> {
    return this.supabase.findConversationsByUserId(userId);
  }

  async create(
    name: string,
    type: 'direct' | 'group',
    memberIds: string[]
  ): Promise<Conversation> {
    const conversation = await this.supabase.createConversation(name, type, memberIds);
    this.logger.log(`Conversation created: ${conversation.id}`);
    return conversation;
  }

  async findOrCreateDirect(userId1: string, userId2: string): Promise<Conversation> {
    return this.supabase.findOrCreateDirectConversation(userId1, userId2);
  }

  async getMembers(conversationId: string): Promise<string[]> {
    return this.supabase.getConversationMembers(conversationId);
  }

  async updateLastMessage(
    conversationId: string,
    lastMessage: string,
    lastMessageTime: string,
    lastSenderId: string,
    lastSenderName: string
  ): Promise<void> {
    await this.supabase.updateLastMessage(
      conversationId,
      lastMessage,
      lastMessageTime,
      lastSenderId,
      lastSenderName,
    );
    this.logger.log(`Updated lastMessage for conversation: ${conversationId}`);
  }
}
