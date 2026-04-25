import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { join } from 'path';
import { ConfigService } from './config.service';
import { GoogleSheetsService } from './google-sheets.service';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath: join(process.cwd(), '.env'),
      isGlobal: true,
    }),
  ],
  providers: [ConfigService, GoogleSheetsService],
  exports: [ConfigService, GoogleSheetsService],
})
export class ConfigModule {}