import { Transform } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

function toPositiveInteger(value: unknown): number {
  if (typeof value !== 'string' || value.trim() === '') {
    return Number.NaN;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN;
}

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Transform(({ value }) => toPositiveInteger(value))
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Transform(({ value }) => Math.min(toPositiveInteger(value), 100))
  @IsInt()
  @Min(1)
  limit = 20;
}
