import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '../config/config.service';
import { AuthResponse, User } from '../common/interfaces';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<Omit<User, 'password_hash'> | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    
    const valid = await this.usersService.verifyPassword(user, password);
    if (!valid) return null;
    
    const { password_hash, ...result } = user;
    return result;
  }

  async generateToken(user: Omit<User, 'password_hash'>): Promise<string> {
    const payload = { sub: user.id, username: user.username, email: user.email };
    return this.jwtService.sign(payload);
  }

  async login(user: User): Promise<AuthResponse> {
    const { password_hash, ...userWithoutPassword } = user;
    const accessToken = await this.generateToken(userWithoutPassword);
    return { accessToken, user: userWithoutPassword };
  }

  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new Error('Email already registered');
    }
    
    const user = await this.usersService.create({ username, email, password });
    return this.login(user);
  }
}