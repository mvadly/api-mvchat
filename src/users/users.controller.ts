import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, LoginDto } from './dto/users.dto';

@Controller('auth')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      return { success: false, message: 'Email already registered' };
    }
    const user = await this.usersService.create(dto);
    return { success: true, user: { id: user.id, username: user.username, email: user.email } };
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      return { success: false, message: 'Invalid credentials' };
    }
    const valid = await this.usersService.verifyPassword(user, dto.password);
    if (!valid) {
      return { success: false, message: 'Invalid credentials' };
    }
    const { password_hash, ...result } = user;
    return { success: true, user: result };
  }

  @Get('users')
  async getAllUsers() {
    const users = await this.usersService.findAll();
    return users.map(({ password_hash, ...u }) => u);
  }

  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    const { password_hash, ...result } = user;
    return { success: true, user: result };
  }
}