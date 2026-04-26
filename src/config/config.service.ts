import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';

interface GoogleServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

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

  get googleSpreadsheetId(): string {
    return this.nestConfig.get<string>('GOOGLE_SPREADSHEET_ID') || '10bLHBJ0rWQyaDv2uVwYmNVNxcBHX2tZw3B01RSkXrxc';
  }

  get googleServiceAccount(): GoogleServiceAccount | null {
    try {
      const credentialsPath = join(process.cwd(), 'credentials.json');
      let credentialsData = readFileSync(credentialsPath, 'utf8');
      if (credentialsData.charCodeAt(0) === 0xFEFF) {
        credentialsData = credentialsData.substring(1);
      }
      const creds = JSON.parse(credentialsData) as GoogleServiceAccount;
      if (creds.private_key) {
        creds.private_key = creds.private_key.replace(/\\n/g, '\n');
      }
      return creds;
    } catch {
      const keyJson = this.nestConfig.get<string>('GOOGLE_SERVICE_ACCOUNT_KEY');
      if (!keyJson) return null;
      try {
        const creds = JSON.parse(keyJson) as GoogleServiceAccount;
        if (creds.private_key) {
          creds.private_key = creds.private_key.replace(/\\n/g, '\n');
        }
        return creds;
      } catch {
        return null;
      }
    }
  }

  get redisUrl(): string {
    return this.nestConfig.get<string>('REDIS_URL') || 'redis://localhost:6379';
  }

  get clientUrl(): string {
    return this.nestConfig.get<string>('CLIENT_URL') || 'http://localhost:3001';
  }

  get googleClientId(): string {
    return this.nestConfig.get<string>('GOOGLE_CLIENT_ID') || '';
  }
}