import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { google } from 'googleapis';
import { ConfigService } from './config.service';

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private sheets: any;
  private spreadsheetId: string;

  constructor(private configService: ConfigService) {
    this.initialize();
  }

  private async initialize() {
    const serviceAccount = this.configService.googleServiceAccount;
    if (!serviceAccount) {
      this.logger.warn('Google service account not configured');
      return;
    }

    const auth = new google.auth.JWT(
      serviceAccount.client_email,
      undefined,
      serviceAccount.private_key,
      ['https://www.googleapis.com/auth/spreadsheets'],
    );

    this.sheets = google.sheets({ version: 'v4', auth });
    this.spreadsheetId = this.configService.googleSpreadsheetId;
    this.logger.log('Google Sheets initialized');
  }

  async getValues(range: string): Promise<any[][]> {
    if (!this.sheets) {
      this.logger.warn('Sheets not initialized');
      return [];
    }
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range,
      });
      return response.data.values || [];
    } catch (error) {
      this.logger.error(`Error getting values from ${range}:`, error);
      return [];
    }
  }

  async setValues(range: string, values: any[][]): Promise<boolean> {
    if (!this.sheets) {
      this.logger.warn('Sheets not initialized');
      return false;
    }
    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
      return true;
    } catch (error) {
      this.logger.error(`Error setting values to ${range}:`, error);
      return false;
    }
  }

  async appendValues(range: string, values: any[][]): Promise<boolean> {
    if (!this.sheets) {
      this.logger.warn('Sheets not initialized');
      return false;
    }
    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
      return true;
    } catch (error) {
      this.logger.error(`Error appending values to ${range}:`, error);
      return false;
    }
  }

  async updateValues(range: string, values: any[][]): Promise<boolean> {
    if (!this.sheets) {
      this.logger.warn('Sheets not initialized');
      return false;
    }
    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
      return true;
    } catch (error) {
      this.logger.error(`Error updating values to ${range}:`, error);
      return false;
    }
  }

  async clearSheet(range: string): Promise<boolean> {
    if (!this.sheets) {
      this.logger.warn('Sheets not initialized');
      return false;
    }
    try {
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range,
      });
      return true;
    } catch (error) {
      this.logger.error(`Error clearing sheet ${range}:`, error);
      return false;
    }
  }
}