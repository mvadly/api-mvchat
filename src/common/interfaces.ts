export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  avatar_url?: string;
  created_at: string;
  player_id?: string;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: Omit<User, 'password_hash'>;
}

export interface Conversation {
  id: string;
  name: string;
  type: 'direct' | 'group';
  created_at: string;
  last_message?: string;
  last_message_time?: string;
  last_sender_id?: string;
  last_sender_name?: string;
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
