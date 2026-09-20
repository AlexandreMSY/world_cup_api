import { ApiProperty } from '@nestjs/swagger';

export class BasicTournamentDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  year: number;
}

export class BasicTeamDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}

export class BasicStadiumDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  ground: string;
}

export class MatchScoreDto {
  @ApiProperty({ nullable: true, type: Number })
  home: number | null;

  @ApiProperty({ nullable: true, type: Number })
  away: number | null;
}

export class MatchSummaryDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ type: BasicTournamentDto })
  tournament: BasicTournamentDto;

  @ApiProperty()
  round: string;

  @ApiProperty({ format: 'date' })
  date: string;

  @ApiProperty({ type: BasicTeamDto })
  homeTeam: BasicTeamDto;

  @ApiProperty({ type: BasicTeamDto })
  awayTeam: BasicTeamDto;

  @ApiProperty({ type: MatchScoreDto })
  score: MatchScoreDto;

  @ApiProperty({ nullable: true, type: BasicStadiumDto })
  stadium: BasicStadiumDto | null;
}
