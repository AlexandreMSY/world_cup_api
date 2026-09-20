import { ApiProperty } from '@nestjs/swagger';

export class StadiumDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  ground: string;
}
