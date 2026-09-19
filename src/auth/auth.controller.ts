import { Controller, Post, Body } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user-dto.js';
import { CreatedUserDto } from './dto/created-user-dto.js';
import { LoginUserDto } from './dto/login-user-dto.js';
import { LoginResponseDto } from './dto/login-response-dto.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() registerUserDto: CreateUserDto,
  ): Promise<CreatedUserDto> {
    return await this.authService.register(registerUserDto);
  }

  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto): Promise<LoginResponseDto> {
    return await this.authService.login(loginUserDto);
  }
}
