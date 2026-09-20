import { ApiProperty } from '@nestjs/swagger';
import { CardType } from '../../bookings/entities/booking.entity.js';
import { BasicPlayerDto, GoalDto } from '../../goals/dto/goal.dto.js';
import { BasicTeamDto, MatchSummaryDto } from './match-summary.dto.js';

export class MatchPlayerDto extends BasicPlayerDto {
  @ApiProperty({ nullable: true, type: String })
  position: string | null;

  @ApiProperty({ nullable: true, type: Number })
  shirtNumber: number | null;

  @ApiProperty()
  captain: boolean;
}

export class TeamLineupDto {
  @ApiProperty({ type: MatchPlayerDto, isArray: true })
  startingXi: MatchPlayerDto[];

  @ApiProperty({ type: MatchPlayerDto, isArray: true })
  bench: MatchPlayerDto[];
}

export class MatchLineupsDto {
  @ApiProperty({ type: TeamLineupDto })
  homeTeam: TeamLineupDto;

  @ApiProperty({ type: TeamLineupDto })
  awayTeam: TeamLineupDto;
}

export class MatchGoalsDto {
  @ApiProperty({ type: GoalDto, isArray: true })
  homeTeam: GoalDto[];

  @ApiProperty({ type: GoalDto, isArray: true })
  awayTeam: GoalDto[];
}

export class SubstitutionDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: BasicTeamDto })
  team: BasicTeamDto;

  @ApiProperty({ type: BasicPlayerDto })
  playerOut: BasicPlayerDto;

  @ApiProperty({ type: BasicPlayerDto })
  playerIn: BasicPlayerDto;

  @ApiProperty({ nullable: true, type: Number })
  minute: number | null;

  @ApiProperty({ nullable: true, type: Number })
  addedTime: number | null;
}

export class BookingDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: BasicTeamDto })
  team: BasicTeamDto;

  @ApiProperty({ type: BasicPlayerDto })
  player: BasicPlayerDto;

  @ApiProperty({ enum: CardType })
  cardType: CardType;

  @ApiProperty({ nullable: true, type: Number })
  minute: number | null;

  @ApiProperty({ nullable: true, type: Number })
  addedTime: number | null;
}

export class MatchDetailDto extends MatchSummaryDto {
  @ApiProperty({ nullable: true, type: String })
  kickoffTime: string | null;

  @ApiProperty({ nullable: true, type: () => Object })
  extraTimeScore: { home: number; away: number } | null;

  @ApiProperty({ nullable: true, type: () => Object })
  penaltyScore: { home: number; away: number } | null;

  @ApiProperty({ type: MatchLineupsDto })
  lineups: MatchLineupsDto;

  @ApiProperty({ type: MatchGoalsDto })
  goals: MatchGoalsDto;

  @ApiProperty({ type: SubstitutionDto, isArray: true })
  substitutions: SubstitutionDto[];

  @ApiProperty({ type: BookingDto, isArray: true })
  bookings: BookingDto[];
}
