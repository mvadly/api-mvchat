import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto, LoginDto } from '../users/dto/users.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

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
    console.log(`Hash: ${user.passwordHash}, Plain: ${dto.password}, Valid: ${valid}`);
    if (!valid) {
      return { success: false, message: 'Invalid credentials, Password is incorrect' };
    }
    const auth = await this.authService.login(user);
    return { success: true, ...auth };
  }
}