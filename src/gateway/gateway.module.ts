import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { MessagesModule } from '../messages/messages.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [MessagesModule, ConversationsModule, UsersModule],
  providers: [ChatGateway],
})
export class GatewayModule {}