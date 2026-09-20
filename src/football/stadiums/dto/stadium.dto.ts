import { ApiProperty } from '@nestjs/swagger';

export class StadiumDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  ground: string;
}
