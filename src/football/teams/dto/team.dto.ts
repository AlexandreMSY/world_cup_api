import { ApiProperty } from '@nestjs/swagger';

export class TeamDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true, type: String })
  code: string | null;
}
