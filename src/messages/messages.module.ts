import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { ConversationsModule } from '../conversations/conversations.module';
import { UsersModule } from '../users/users.module';
import { PushService } from '../config/push.service';

@Module({
  imports: [ConversationsModule, UsersModule],
  controllers: [MessagesController],
  providers: [MessagesService, PushService],
  exports: [MessagesService],
})
export class MessagesModule {}