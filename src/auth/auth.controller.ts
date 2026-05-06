import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto, LoginDto } from '../users/dto/users.dto';
import { ConfigService } from '../config/config.service';
import { OAuth2Client } from 'google-auth-library';

@Controller('auth')
export class AuthController {
  private oauth2Client: OAuth2Client;

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {
    this.oauth2Client = new OAuth2Client(
      this.configService.googleClientId,
    );
  }

  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      return { success: false, message: 'Email already registered' };
    }
    const user = await this.authService.register(dto.username, dto.email, dto.password);
    return { success: true, ...user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      return { success: false, message: 'Invalid credentials, Email not registered' };
    }
    console.log({ user });
    const valid = await this.usersService.verifyPassword(user, dto.password);
    console.log(`Hash: ${user.password_hash}, Plain: ${dto.password}, Valid: ${valid}`);
    if (!valid) {
      return { success: false, message: 'Invalid credentials, Password is incorrect' };
    }
    const auth = await this.authService.login(user);
    return { success: true, ...auth };
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() body: { googleToken: string }) {
    try {
      const { googleToken } = body;
      if (!googleToken) {
        return { success: false, message: 'Google token is required' };
      }

      // Verify the Google token
      const ticket = await this.oauth2Client.verifyIdToken({
        idToken: googleToken,
        audience: this.configService.googleClientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return { success: false, message: 'Invalid Google token' };
      }

      const email: string = payload.email;
      const name: string = payload.name || email.split('@')[0];

      // Check if user exists, create if not
      let user = await this.usersService.findByEmail(email);
      
      if (!user) {
        // Create new user with Google-generated password
        const randomPassword = 'google_' + Math.random().toString(36).substring(2);
        const result = await this.authService.register(name, email, randomPassword);
        user = await this.usersService.findByEmail(email);
      }

      if (!user) {
        return { success: false, message: 'User creation failed' };
      }

      // Generate JWT
      const { password_hash, ...userWithoutPassword } = user;
      const auth = await this.authService.login(user);
      return { success: true, ...auth, user: userWithoutPassword };
    } catch (error) {
      console.error('Google login error:', error);
      return { success: false, message: 'Invalid Google token' };
    }
  }

  @Post('update-token')
  @HttpCode(HttpStatus.OK)
  async updateToken(@Body() body: { userId: string; playerId: string }) {
    try {
      const { userId, playerId } = body;
      if (!userId || !playerId) {
        return { success: false, message: 'userId and playerId are required' };
      }

      await this.usersService.updatePlayerId(userId, playerId);
      return { success: true, message: 'Token updated' };
    } catch (error) {
      console.error('Update token error:', error);
      return { success: false, message: 'Failed to update token' };
    }
  }
}
