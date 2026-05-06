import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly appId: string;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.appId = this.configService.get<string>('ONESIGNAL_APP_ID') || '';
    this.apiKey = this.configService.get<string>('ONESIGNAL_API_KEY') || '';
  }

  async sendNotification({
    playerId,
    title,
    message,
    data,
  }: {
    playerId: string;
    title: string;
    message: string;
    data?: Record<string, any>;
  }): Promise<void> {
    if (!this.appId || !this.apiKey) {
      this.logger.warn('OneSignal not configured, skipping push notification');
      return;
    }

    try {
      const response = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${this.apiKey}`,
        },
        body: JSON.stringify({
          app_id: this.appId,
          include_player_ids: [playerId],
          headings: { en: title },
          contents: { en: message },
          data,
        }),
      });

      const result = await response.json();
      this.logger.log(`OneSignal notification sent: ${result.id || 'unknown'}`);
    } catch (error) {
      this.logger.error(`OneSignal send error: ${error}`);
    }
  }
}
