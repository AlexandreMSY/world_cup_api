import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user-dto.js';
import { CreatedUserDto } from './dto/created-user-dto.js';
import { LoginUserDto } from './dto/login-user-dto.js';
import { LoginResponseDto } from './dto/login-response-dto.js';
import argon2 from 'argon2';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from './entities/user.entity.js';

const accessTokenExpirationSeconds = 30 * 60;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerUserDto: CreateUserDto): Promise<CreatedUserDto> {
    const hashedPassword = await argon2.hash(registerUserDto.password);

    const user = this.userRepository.create({
      email: registerUserDto.email,
      password_hash: hashedPassword,
    });

    await this.userRepository.save(user);

    return {
      email: user.email,
      createdAt: user.created_at,
    };
  }

  async login(loginUserDto: LoginUserDto): Promise<LoginResponseDto> {
    const user = await this.userRepository.findOneBy({
      email: loginUserDto.email,
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await argon2.verify(
      user.password_hash,
      loginUserDto.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessTokenExpiresAt = await this.userRepository.manager.transaction(
      async (manager) => {
        const lockedUser = await manager.findOne(User, {
          where: { id: user.id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!lockedUser) {
          throw new UnauthorizedException('Invalid email or password');
        }

        const now = new Date();

        if (
          lockedUser.access_token_expires_at &&
          lockedUser.access_token_expires_at > now
        ) {
          return lockedUser.access_token_expires_at;
        }

        const expiresAt = new Date(
          (Math.floor(now.getTime() / 1000) + accessTokenExpirationSeconds) *
            1000,
        );
        lockedUser.access_token_expires_at = expiresAt;
        await manager.save(lockedUser);

        return expiresAt;
      },
    );
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        exp: Math.floor(accessTokenExpiresAt.getTime() / 1000),
      },
      { noTimestamp: true },
    );

    return { accessToken };
  }
}
