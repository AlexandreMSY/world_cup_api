import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { User } from './entities/user.entity.js';

const userRepository = {
  create: vi.fn(),
  save: vi.fn(),
  findOneBy: vi.fn(),
};
const jwtService = {
  signAsync: vi.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns an access token for valid credentials', async () => {
    const user = {
      id: 'user-id',
      email: 'user@example.com',
      password_hash: await argon2.hash('password123'),
    } as User;
    userRepository.findOneBy.mockResolvedValue(user);
    jwtService.signAsync.mockResolvedValue('token');

    await expect(
      service.login({ email: 'user@example.com', password: 'password123' }),
    ).resolves.toEqual({ accessToken: 'token' });
    expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: user.id });
  });

  it('rejects an unknown email with an unauthorized error', async () => {
    userRepository.findOneBy.mockResolvedValue(null);

    await expect(
      service.login({ email: 'unknown@example.com', password: 'password123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an invalid password with an unauthorized error', async () => {
    const user = {
      id: 'user-id',
      email: 'user@example.com',
      password_hash: await argon2.hash('different-password'),
    } as User;
    userRepository.findOneBy.mockResolvedValue(user);

    await expect(
      service.login({ email: 'user@example.com', password: 'password123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
