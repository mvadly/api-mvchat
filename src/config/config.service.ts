import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private nestConfig: NestConfigService) {}

  get port(): number {
    return this.nestConfig.get<number>('PORT') || 3000;
  }

  get jwtSecret(): string {
    return this.nestConfig.get<string>('JWT_SECRET') || 'super-secret-key-change-in-production';
  }

  get jwtExpiresIn(): string {
    return this.nestConfig.get<string>('JWT_EXPIRES_IN') || '7d';
  }

  get clientUrl(): string {
    return this.nestConfig.get<string>('CLIENT_URL') || 'http://localhost:3001';
  }

  get googleClientId(): string {
    return this.nestConfig.get<string>('GOOGLE_CLIENT_ID') || '';
  }

  get oneSignalAppId(): string {
    return this.nestConfig.get<string>('ONESIGNAL_APP_ID') || '';
  }

  get oneSignalApiKey(): string {
    return this.nestConfig.get<string>('ONESIGNAL_API_KEY') || '';
  }
}
