import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('conversations')
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Get()
  async getAll() {
    return this.conversationsService.findAll();
  }

  @Get('user/:userId')
  async getByUser(@Param('userId') userId: string) {
    return this.conversationsService.findByUserId(userId);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.conversationsService.findById(id);
  }

  @Get(':id/members')
  async getMembers(@Param('id') id: string) {
    return this.conversationsService.getMembers(id);
  }

  @Post()
  async create(@Body() body: { name: string; type: 'direct' | 'group'; memberIds: string[] }) {
    return this.conversationsService.create(body.name, body.type, body.memberIds);
  }

  @Post('direct/:userId1/:userId2')
  async createDirect(
    @Param('userId1') userId1: string,
    @Param('userId2') userId2: string,
  ) {
    return this.conversationsService.findOrCreateDirect(userId1, userId2);
  }
}