import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeysController } from './api-keys.controller.js';
import { ApiKeysService } from './api-keys.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

const apiKeysService = {
  delete: vi.fn(),
  generate: vi.fn(),
};
const jwtAuthGuard = {
  canActivate: vi.fn(),
};

describe('ApiKeysController', () => {
  let controller: ApiKeysController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiKeysController],
      providers: [{ provide: ApiKeysService, useValue: apiKeysService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(jwtAuthGuard)
      .compile();

    controller = module.get<ApiKeysController>(ApiKeysController);
  });

  it('generates an API key for the authenticated user', async () => {
    apiKeysService.generate.mockResolvedValue({ api_key: 'api-key' });

    await expect(
      controller.generate({ user: { id: 'user-id' } } as never),
    ).resolves.toEqual({ api_key: 'api-key' });
    expect(apiKeysService.generate).toHaveBeenCalledWith('user-id');
  });

  it('deletes the API key for the authenticated user', async () => {
    apiKeysService.delete.mockResolvedValue({
      message: 'API key successfully deleted',
    });

    await expect(
      controller.delete({ user: { id: 'user-id' } } as never),
    ).resolves.toEqual({ message: 'API key successfully deleted' });
    expect(apiKeysService.delete).toHaveBeenCalledWith('user-id');
  });
});
