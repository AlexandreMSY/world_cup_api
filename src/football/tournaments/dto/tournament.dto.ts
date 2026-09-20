import { ApiProperty } from '@nestjs/swagger';

export class TournamentDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  year: number;

  @ApiProperty({ nullable: true, type: String })
  host: string | null;

  @ApiProperty({ format: 'date', nullable: true, type: String })
  startDate: string | null;

  @ApiProperty({ format: 'date', nullable: true, type: String })
  endDate: string | null;
}
