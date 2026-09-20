import { PaginationQueryDto } from './dto/pagination-query.dto.js';

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export function createPaginatedResponse<T>(
  data: T[],
  totalItems: number,
  pagination: PaginationQueryDto,
): PaginatedResponse<T> {
  return {
    data,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / pagination.limit),
    },
  };
}
