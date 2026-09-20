import { ApiProperty } from '@nestjs/swagger';

export class BasicTournamentDto {
  @ApiProperty()
  slug: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  year: number;
}

export class BasicTeamDto {
  @ApiProperty()
  slug: string;

  @ApiProperty()
  name: string;
}

export class BasicStadiumDto {
  @ApiProperty()
  slug: string;

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
  slug: string;

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
