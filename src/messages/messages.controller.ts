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
  async create(@Body() body: { conversationId: string; senderId: string; senderName?: string; content: string; type?: 'text' | 'image' }) {
    return this.messagesService.createMessage(
      body.conversationId,
      body.senderId,
      body.senderName || 'Unknown Sender',
      body.content,
      body.type || 'text',
    );
  }

  @Post('upsert')
  async upsert(@Body() body: Message) {
    return this.messagesService.upsertMessage(body);
  }
}