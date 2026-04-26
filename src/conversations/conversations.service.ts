import { Injectable, Logger } from '@nestjs/common';
import { GoogleSheetsService } from '../config';
import { Conversation, ConversationMember } from '../common/interfaces';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);
  private readonly SHEET_NAME = 'Conversations';
  private readonly MEMBERS_SHEET = 'ConversationMembers';

  constructor(private googleSheets: GoogleSheetsService) {}

  async findAll(): Promise<Conversation[]> {
    const data = await this.googleSheets.getValues(this.SHEET_NAME);
    if (!data.length) return [];

    const conversations: Conversation[] = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.length >= 4) {
        conversations.push({
          id: row[0],
          name: row[1],
          type: row[2] as 'direct' | 'group',
          createdAt: row[3],
          lastMessage: row[4] || '',
          lastMessageTime: row[5] || '',
          lastSenderId: row[6] || '',
          lastSenderName: row[7] || '',
        });
      }
    }
    return conversations;
  }

  async findById(id: string): Promise<Conversation | null> {
    const conversations = await this.findAll();
    return conversations.find(c => c.id === id) || null;
  }

  async findByUserId(userId: string): Promise<Conversation[]> {
    const data = await this.googleSheets.getValues(this.MEMBERS_SHEET);
    if (!data.length) return [];

    const conversationIds = new Set<string>();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.length >= 2 && row[1] === userId) {
        conversationIds.add(row[0]);
      }
    }

    const conversations = await this.findAll();
    return conversations.filter(c => conversationIds.has(c.id));
  }

  async create(name: string, type: 'direct' | 'group', memberIds: string[]): Promise<Conversation> {
    const id = this.generateId();
    const createdAt = new Date().toISOString();

    await this.googleSheets.appendValues(`${this.SHEET_NAME}!A${(await this.getNextRow())}:D`, [[id, name, type, createdAt]]);

    for (const userId of memberIds) {
      await this.googleSheets.appendValues(`${this.MEMBERS_SHEET}!A${(await this.getNextMemberRow())}:C`, [[id, userId, 'member']]);
    }

    this.logger.log(`Conversation created: ${id}`);
    return { id, name, type, createdAt };
  }

  async findOrCreateDirect(userId1: string, userId2: string): Promise<Conversation> {
    const data = await this.googleSheets.getValues(this.MEMBERS_SHEET);
    const convMap = new Map<string, string[]>();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.length >= 2) {
        const convId = row[0];
        const memberId = row[1];
        if (!convMap.has(convId)) convMap.set(convId, []);
        convMap.get(convId)!.push(memberId);
      }
    }

    for (const [convId, members] of convMap.entries()) {
      if (members.includes(userId1) && members.includes(userId2) && members.length === 2) {
        const conv = await this.findById(convId);
        if (conv && conv.type === 'direct') return conv;
      }
    }

    return this.create(`dm_${userId1}_${userId2}`, 'direct', [userId1, userId2]);
  }

  async getMembers(conversationId: string): Promise<string[]> {
    const data = await this.googleSheets.getValues(this.MEMBERS_SHEET);
    const members: string[] = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.length >= 2 && row[0] === conversationId) {
        members.push(row[1]);
      }
    }
    return members;
  }

  async updateLastMessage(
    conversationId: string,
    lastMessage: string,
    lastMessageTime: string,
    lastSenderId: string,
    lastSenderName: string
  ): Promise<void> {
    const data = await this.googleSheets.getValues(this.SHEET_NAME);
    let rowIndex = -1;

    for (let i = 1; i < data.length; i++) {
      if (data[i].length >= 1 && data[i][0] === conversationId) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) return;

    const range = `A${rowIndex}:H`;
    const existingRow = data[rowIndex - 1] || [];
    const currentValues = [
      existingRow[0] || '',
      existingRow[1] || '',
      existingRow[2] || '',
      existingRow[3] || '',
      lastMessage,
      lastMessageTime,
      lastSenderId,
      lastSenderName,
    ];

    await this.googleSheets.updateValues(range, [currentValues]);
    this.logger.log(`Updated lastMessage for conversation: ${conversationId}`);
  }

  private generateId(): string {
    return 'conv_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private async getNextRow(): Promise<number> {
    const data = await this.googleSheets.getValues(this.SHEET_NAME);
    return data.length + 1;
  }

  private async getNextMemberRow(): Promise<number> {
    const data = await this.googleSheets.getValues(this.MEMBERS_SHEET);
    return data.length + 1;
  }
}