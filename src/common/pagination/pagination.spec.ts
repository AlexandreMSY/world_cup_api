import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaginationQueryDto } from './dto/pagination-query.dto.js';
import { createPaginatedResponse } from './pagination.js';

describe('PaginationQueryDto', () => {
  it('uses the default page and limit', async () => {
    const pagination = plainToInstance(PaginationQueryDto, {});

    expect(await validate(pagination)).toHaveLength(0);
    expect(pagination).toMatchObject({ page: 1, limit: 20 });
  });

  it('clamps the limit to 100', async () => {
    const pagination = plainToInstance(PaginationQueryDto, {
      page: '2',
      limit: '250',
    });

    expect(await validate(pagination)).toHaveLength(0);
    expect(pagination).toMatchObject({ page: 2, limit: 100 });
  });

  it.each([
    { page: 'zero', limit: '20' },
    { page: '0', limit: '20' },
    { page: '1', limit: '0' },
    { page: '1.5', limit: '20' },
    { page: '1', limit: 'many' },
  ])('rejects invalid values: %o', async (query) => {
    const pagination = plainToInstance(PaginationQueryDto, query);

    expect(await validate(pagination)).not.toHaveLength(0);
  });
});

describe('createPaginatedResponse', () => {
  it('calculates pagination metadata', () => {
    expect(
      createPaginatedResponse(['item'], 41, { page: 2, limit: 20 }),
    ).toEqual({
      data: ['item'],
      meta: { page: 2, limit: 20, totalItems: 41, totalPages: 3 },
    });
  });

  it('returns zero pages for an empty collection', () => {
    expect(
      createPaginatedResponse([], 0, { page: 1, limit: 20 }).meta,
    ).toMatchObject({ totalItems: 0, totalPages: 0 });
  });
});
