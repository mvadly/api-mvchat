import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  avatar_url?: string;
  player_id?: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  name: string;
  type: 'direct' | 'group';
  last_message?: string;
  last_message_time?: string;
  last_sender_id?: string;
  last_sender_name?: string;
  created_at: string;
}

export interface ConversationMember {
  conversation_id: string;
  user_id: string;
  role: 'admin' | 'member';
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  type: 'text' | 'image';
  created_at: string;
  read_at?: string;
}

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !key) {
      this.logger.error('Supabase credentials not configured');
      return;
    }

    this.client = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Test connection
    const { error } = await this.client.from('users').select('id').limit(1);
    if (error) {
      this.logger.error(`Supabase connection failed: ${error.message}`);
    } else {
      this.logger.log('Supabase connected successfully');
    }
  }

  // ============ USERS ============

  async findAllUsers(): Promise<User[]> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      this.logger.error(`Error finding users: ${error.message}`);
      return [];
    }
    return data || [];
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) return null;
    return data;
  }

  async findUserById(id: string): Promise<User | null> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  async createUser(user: Partial<User>): Promise<User> {
    const { data, error } = await this.client
      .from('users')
      .insert([{
        username: user.username,
        email: user.email,
        password_hash: user.password_hash,
        avatar_url: user.avatar_url || '',
        player_id: user.player_id || '',
      }])
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating user: ${error.message}`);
      throw new Error(error.message);
    }
    return data;
  }

  async updateUserPlayerId(userId: string, playerId: string): Promise<void> {
    const { error } = await this.client
      .from('users')
      .update({ player_id: playerId })
      .eq('id', userId);

    if (error) {
      this.logger.error(`Error updating player ID: ${error.message}`);
    }
  }

  // ============ CONVERSATIONS ============

  async findAllConversations(): Promise<Conversation[]> {
    const { data, error } = await this.client
      .from('conversations')
      .select('*')
      .order('last_message_time', { ascending: false, nullsFirst: false });

    if (error) {
      this.logger.error(`Error finding conversations: ${error.message}`);
      return [];
    }
    return data || [];
  }

  async findConversationById(id: string): Promise<Conversation | null> {
    const { data, error } = await this.client
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  async findConversationsByUserId(userId: string): Promise<Conversation[]> {
    const { data, error } = await this.client
      .from('conversation_members')
      .select('conversations(*)')
      .eq('user_id', userId);

    if (error) {
      this.logger.error(`Error finding conversations by user: ${error.message}`);
      return [];
    }
    return ((data || []) as any[]).map(d => d.conversations as Conversation).filter(Boolean);
  }

  async createConversation(
    name: string,
    type: 'direct' | 'group',
    memberIds: string[]
  ): Promise<Conversation> {
    const { data: conv, error: convError } = await this.client
      .from('conversations')
      .insert([{ name, type }])
      .select()
      .single();

    if (convError) {
      this.logger.error(`Error creating conversation: ${convError.message}`);
      throw new Error(convError.message);
    }

    const members = memberIds.map(userId => ({
      conversation_id: conv.id,
      user_id: userId,
      role: 'member' as const,
    }));

    const { error: memberError } = await this.client
      .from('conversation_members')
      .insert(members);

    if (memberError) {
      this.logger.error(`Error adding members: ${memberError.message}`);
    }

    return conv;
  }

  async findOrCreateDirectConversation(
    userId1: string,
    userId2: string
  ): Promise<Conversation> {
    const { data: members, error } = await this.client
      .from('conversation_members')
      .select('conversation_id')
      .in('user_id', [userId1, userId2]);

    if (error) {
      throw new Error(error.message);
    }

    const convIdCount = new Map<string, number>();
    for (const m of members) {
      convIdCount.set(m.conversation_id, (convIdCount.get(m.conversation_id) || 0) + 1);
    }

    for (const [convId, count] of convIdCount.entries()) {
      if (count === 2) {
        const conv = await this.findConversationById(convId);
        if (conv && conv.type === 'direct') return conv;
      }
    }

    const [user1, user2] = await Promise.all([
      this.findUserById(userId1),
      this.findUserById(userId2),
    ]);
    const name = `${user1?.username || 'Unknown'} & ${user2?.username || 'Unknown'}`;
    return this.createConversation(name, 'direct', [userId1, userId2]);
  }

  async getConversationMembers(conversationId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', conversationId);

    if (error) {
      this.logger.error(`Error getting members: ${error.message}`);
      return [];
    }
    return (data || []).map(d => d.user_id);
  }

  async updateLastMessage(
    conversationId: string,
    lastMessage: string,
    lastMessageTime: string,
    lastSenderId: string,
    lastSenderName: string
  ): Promise<void> {
    const { error } = await this.client
      .from('conversations')
      .update({
        last_message: lastMessage,
        last_message_time: lastMessageTime,
        last_sender_id: lastSenderId,
        last_sender_name: lastSenderName,
      })
      .eq('id', conversationId);

    if (error) {
      this.logger.error(`Error updating last message: ${error.message}`);
    }
  }

  // ============ MESSAGES ============

  async findMessagesByConversation(conversationId: string): Promise<Message[]> {
    const { data, error } = await this.client
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      this.logger.error(`Error finding messages: ${error.message}`);
      return [];
    }
    return data || [];
  }

  async createMessage(message: Partial<Message>): Promise<Message> {
    const { data, error } = await this.client
      .from('messages')
      .insert([{
        conversation_id: message.conversation_id,
        sender_id: message.sender_id,
        sender_name: message.sender_name || 'Unknown Sender',
        content: message.content,
        type: message.type || 'text',
      }])
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating message: ${error.message}`);
      throw new Error(error.message);
    }
    return data;
  }

  async upsertMessage(message: Message): Promise<Message> {
    const { data: existing } = await this.client
      .from('messages')
      .select('*')
      .eq('id', message.id)
      .single();

    if (existing) {
      const { data, error } = await this.client
        .from('messages')
        .update({
          content: message.content,
          sender_name: message.sender_name,
          type: message.type,
          read_at: message.read_at,
        })
        .eq('id', message.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }

    return this.createMessage(message);
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    const { error } = await this.client
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) {
      this.logger.error(`Error marking message as read: ${error.message}`);
    }
  }
}
