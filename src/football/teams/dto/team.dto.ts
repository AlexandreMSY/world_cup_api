import { ApiProperty } from '@nestjs/swagger';

export class TeamDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true, type: String })
  code: string | null;
}
