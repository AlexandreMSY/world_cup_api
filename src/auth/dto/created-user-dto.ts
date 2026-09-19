import { ApiProperty } from '@nestjs/swagger';

export class CreatedUserDto {
  @ApiProperty({ example: 'user@example.com', format: 'email' })
  email: string;

  @ApiProperty({ example: '2026-09-19T14:01:42.000Z', format: 'date-time' })
  createdAt: Date;
}
