import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    UsersModule,
    ConversationsModule,
    MessagesModule,
    GatewayModule,
  ],
})
export class AppModule {}