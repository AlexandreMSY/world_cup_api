import { ApiProperty } from '@nestjs/swagger';

export class TeamDto {
  @ApiProperty()
  slug: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true, type: String })
  code: string | null;
}
