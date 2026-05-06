import { Injectable, Logger } from '@nestjs/common';
import { GoogleSheetsService } from '../config';
import { User, CreateUserDto } from '../common/interfaces';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly SALT_ROUNDS = 10;
  private readonly USERS_SHEET = 'Users';

  constructor(private googleSheets: GoogleSheetsService) {}

  async findAll(): Promise<User[]> {
    const data = await this.googleSheets.getValues(this.USERS_SHEET);
    console.log('Fetched users data:', data);
    if (!data.length) return [];

    const headers = data[0].map((h: string) => h.toLowerCase());
    const users: User[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.length < 5) continue;
      
      const user: any = { id: row[headers.indexOf('id')] || '' };
      user.username = row[headers.indexOf('username')] || '';
      user.email = row[headers.indexOf('email')] || '';
      user.passwordHash = row[headers.indexOf('password')] || '';
      user.avatarUrl = row[headers.indexOf('avatar_url')] || '';
      user.createdAt = row[headers.indexOf('created_at')] || '';
      user.playerId = row[headers.indexOf('player_id')] || row[6] || '';
      
      if (user.id) users.push(user as User);
    }

    return users;
  }

  async findByEmail(email: string): Promise<User | null> {
    const users = await this.findAll();
    return users.find(u => u.email === email) || null;
  }

  async findById(id: string): Promise<User | null> {
    const users = await this.findAll();
    return users.find(u => u.id === id) || null;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const id = this.generateId();
    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
    const createdAt = new Date().toISOString();

    const newUser = [id, dto.username, dto.email, passwordHash, '', createdAt];
    await this.googleSheets.appendValues(`${this.USERS_SHEET}!A${(await this.getNextRow())}:F`, [newUser]);

    this.logger.log(`User created: ${dto.email}`);
    return { id, username: dto.username, email: dto.email, passwordHash, createdAt };
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  private generateId(): string {
    return 'usr_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private async getNextRow(): Promise<number> {
    const data = await this.googleSheets.getValues(this.USERS_SHEET);
    this.logger.log(`Users sheet row count: ${data.length}`);
    return data.length + 1;
  }
}