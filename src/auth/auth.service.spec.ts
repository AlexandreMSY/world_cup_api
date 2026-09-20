import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { User } from './entities/user.entity.js';

const transactionManager = {
  findOne: vi.fn(),
  save: vi.fn(),
};
const userRepository = {
  create: vi.fn(),
  save: vi.fn(),
  findOneBy: vi.fn(),
  manager: {
    transaction: vi.fn(),
  },
};
const jwtService = {
  signAsync: vi.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    vi.clearAllMocks();
    userRepository.manager.transaction.mockImplementation(async (callback) =>
      callback(transactionManager),
    );

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
      access_token_expires_at: null,
    } as User;
    userRepository.findOneBy.mockResolvedValue(user);
    transactionManager.findOne.mockResolvedValue(user);
    jwtService.signAsync.mockResolvedValue('token');

    await expect(
      service.login({ email: 'user@example.com', password: 'password123' }),
    ).resolves.toEqual({ accessToken: 'token' });
    expect(transactionManager.findOne).toHaveBeenCalledWith(User, {
      where: { id: user.id },
      lock: { mode: 'pessimistic_write' },
    });
    expect(transactionManager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        access_token_expires_at: expect.any(Date),
      }),
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      { sub: user.id, exp: expect.any(Number) },
      { noTimestamp: true },
    );
  });

  it('reuses an active token expiry without extending it', async () => {
    const accessTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const user = {
      id: 'user-id',
      email: 'user@example.com',
      password_hash: await argon2.hash('password123'),
      access_token_expires_at: accessTokenExpiresAt,
    } as User;
    userRepository.findOneBy.mockResolvedValue(user);
    transactionManager.findOne.mockResolvedValue(user);
    jwtService.signAsync.mockImplementation(async (payload) =>
      String((payload as { exp: number }).exp),
    );

    const firstLogin = await service.login({
      email: 'user@example.com',
      password: 'password123',
    });
    const secondLogin = await service.login({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(firstLogin).toEqual(secondLogin);
    expect(transactionManager.save).not.toHaveBeenCalled();
  });

  it('creates a new token lifetime after expiration', async () => {
    const user = {
      id: 'user-id',
      email: 'user@example.com',
      password_hash: await argon2.hash('password123'),
      access_token_expires_at: new Date(Date.now() - 1000),
    } as User;
    userRepository.findOneBy.mockResolvedValue(user);
    transactionManager.findOne.mockResolvedValue(user);
    jwtService.signAsync.mockImplementation(async (payload) =>
      String((payload as { exp: number }).exp),
    );

    const response = await service.login({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(response.accessToken).toBe(
      String(Math.floor(user.access_token_expires_at.getTime() / 1000)),
    );
    expect(transactionManager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        access_token_expires_at: expect.any(Date),
      }),
    );
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
