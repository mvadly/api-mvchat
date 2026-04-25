export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  createdAt: string;
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
  user: Omit<User, 'passwordHash'>;
}

export interface Conversation {
  id: string;
  name: string;
  type: 'direct' | 'group';
  createdAt: string;
}

export interface ConversationMember {
  conversationId: string;
  userId: string;
  role: 'admin' | 'member';
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'image';
  createdAt: string;
  readAt?: string;
}