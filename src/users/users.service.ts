import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService, User } from '../config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(private supabase: SupabaseService) {}

  async findAll(): Promise<User[]> {
    const users = await this.supabase.findAllUsers();
    this.logger.log(`Fetched ${users.length} users`);
    return users;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.supabase.findUserByEmail(email);
  }

  async findById(id: string): Promise<User | null> {
    return this.supabase.findUserById(id);
  }

  async create(dto: { username: string; email: string; password: string }): Promise<User> {
    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
    const user = await this.supabase.createUser({
      username: dto.username,
      email: dto.email,
      password_hash: passwordHash,
    });

    this.logger.log(`User created: ${dto.email}`);
    return user;
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  }

  async updatePlayerId(userId: string, playerId: string): Promise<void> {
    await this.supabase.updateUserPlayerId(userId, playerId);
    this.logger.log(`Player ID updated for user: ${userId}`);
  }
}
