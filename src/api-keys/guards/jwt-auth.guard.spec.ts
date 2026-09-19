import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

const jwtService = {
  verifyAsync: vi.fn(),
};
const userRepository = {
  findOneBy: vi.fn(),
};

function createContext(request: { headers: { authorization?: string } }) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new JwtAuthGuard(
      jwtService as JwtService,
      userRepository as Repository<User>,
    );
  });

  it('accepts a valid Bearer token and adds the user ID to the request', async () => {
    const request = { headers: { authorization: 'Bearer token' } };
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-id' });
    userRepository.findOneBy.mockResolvedValue({ id: 'user-id' });

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request).toMatchObject({ user: { id: 'user-id' } });
  });

  it('rejects a request without a Bearer token', async () => {
    await expect(
      guard.canActivate(createContext({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an invalid token', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

    await expect(
      guard.canActivate(
        createContext({ headers: { authorization: 'Bearer token' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token when its user no longer exists', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-id' });
    userRepository.findOneBy.mockResolvedValue(null);

    await expect(
      guard.canActivate(
        createContext({ headers: { authorization: 'Bearer token' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
