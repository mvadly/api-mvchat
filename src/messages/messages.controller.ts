import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { Message } from '../common/interfaces';

@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get('conversation/:conversationId')
  async getByConversation(@Param('conversationId') conversationId: string) {
    return this.messagesService.findByConversation(conversationId);
  }

  @Post()
  async create(@Body() body: { conversationId?: string; conversation_id?: string; senderId?: string; sender_id?: string; senderName?: string; sender_name?: string; content: string; type?: 'text' | 'image' }) {
    return this.messagesService.createMessage(
      body.conversationId || body.conversation_id || '',
      body.senderId || body.sender_id || '',
      body.senderName || body.sender_name || 'Unknown Sender',
      body.content,
      body.type || 'text',
    );
  }

  @Post('upsert')
  async upsert(@Body() body: any) {
    const mapped: Message = {
      id: body.id,
      conversation_id: body.conversationId || body.conversation_id || '',
      sender_id: body.senderId || body.sender_id || '',
      sender_name: body.senderName || body.sender_name || 'Unknown Sender',
      content: body.content,
      type: body.type || 'text',
      created_at: body.createdAt || body.created_at || new Date().toISOString(),
      read_at: body.readAt || body.read_at,
    };
    return this.messagesService.upsertMessage(mapped);
  }
}