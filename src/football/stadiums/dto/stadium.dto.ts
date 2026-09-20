import { ApiProperty } from '@nestjs/swagger';

export class StadiumDto {
  @ApiProperty()
  slug: string;

  @ApiProperty()
  ground: string;
}
