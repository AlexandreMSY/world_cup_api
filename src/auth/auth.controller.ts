import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { CreateUserDto } from './dto/create-user-dto.js';
import { CreatedUserDto } from './dto/created-user-dto.js';
import { LoginResponseDto } from './dto/login-response-dto.js';
import { LoginUserDto } from './dto/login-user-dto.js';

@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a user' })
  @ApiCreatedResponse({ type: CreatedUserDto })
  @ApiBadRequestResponse({ description: 'The request body is invalid.' })
  async register(
    @Body() registerUserDto: CreateUserDto,
  ): Promise<CreatedUserDto> {
    return await this.authService.register(registerUserDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Log in and receive an access token' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiBadRequestResponse({ description: 'The request body is invalid.' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password.' })
  async login(@Body() loginUserDto: LoginUserDto): Promise<LoginResponseDto> {
    return await this.authService.login(loginUserDto);
  }
}
