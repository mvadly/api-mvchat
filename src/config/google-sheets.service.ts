import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { google } from 'googleapis';
import { ConfigService } from './config.service';

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private sheets: any;
  private spreadsheetId: string;
  private cache = new Map<string, { data: any[][]; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 60 seconds cache

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
    // Extract sheet name from range (e.g., "Conversations!A1:H" → "Conversations")
    const sheetName = range.split('!')[0];
    const now = Date.now();
    
    // Check cache first
    const cached = this.cache.get(sheetName);
    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      return cached.data;
    }
    
    if (!this.sheets) {
      this.logger.warn('Sheets not initialized');
      return [];
    }
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range,
      });
      const data = response.data.values || [];
      
      // Cache the data
      this.cache.set(sheetName, { data, timestamp: now });
      this.logger.log(`Fetched ${data.length} rows from ${sheetName} (cache ${cached ? 'miss' : 'hit'})`);
      
      return data;
    } catch (error) {
      this.logger.error(`Error getting values from ${range}:`, error);
      // Return cached data if available, even if expired
      if (cached) {
        this.logger.warn(`Returning expired cache for ${sheetName}`);
        return cached.data;
      }
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
    // Invalidate cache on write
    const sheetName = range.split('!')[0];
    this.cache.delete(sheetName);
    
    if (!this.sheets) {
      this.logger.warn('Sheets not initialized');
      return false;
    }
    this.logger.log(`Appending to range: ${range}, values: ${JSON.stringify(values)}`);
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
    // Invalidate cache on write
    const sheetName = range.split('!')[0];
    this.cache.delete(sheetName);
    
    if (!this.sheets) {
      this.logger.warn('Sheets not initialized');
      return false;
    }
    
    this.logger.log(`Updating range: ${range}, values: ${JSON.stringify(values)}`);
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