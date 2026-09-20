import { ApiProperty } from '@nestjs/swagger';
import { CardType } from '../../bookings/entities/booking.entity.js';
import { BasicPlayerDto, GoalDto } from '../../goals/dto/goal.dto.js';
import {
  BasicTeamDto,
  MatchScoreDto,
  MatchSummaryDto,
} from './match-summary.dto.js';

export class MatchPlayerDto extends BasicPlayerDto {
  @ApiProperty()
  captain: boolean;

  @ApiProperty({ nullable: true, type: String })
  position: string | null;

  @ApiProperty({ nullable: true, type: Number })
  shirtNumber: number | null;
}

export class MatchTeamPlayersDto extends BasicTeamDto {
  @ApiProperty({ type: MatchPlayerDto, isArray: true })
  startingXI: MatchPlayerDto[];

  @ApiProperty({ type: MatchPlayerDto, isArray: true })
  bench: MatchPlayerDto[];
}

export class MatchPlayersDto {
  @ApiProperty({ type: MatchTeamPlayersDto })
  homeTeam: MatchTeamPlayersDto;

  @ApiProperty({ type: MatchTeamPlayersDto })
  awayTeam: MatchTeamPlayersDto;
}

export class MatchGoalsDto {
  @ApiProperty({ type: GoalDto, isArray: true })
  homeTeam: GoalDto[];

  @ApiProperty({ type: GoalDto, isArray: true })
  awayTeam: GoalDto[];
}

export class SubstitutionDto {
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

  @ApiProperty({ nullable: true, type: MatchScoreDto })
  scoreExtraTime: MatchScoreDto | null;

  @ApiProperty({ nullable: true, type: MatchScoreDto })
  scorePenalties: MatchScoreDto | null;

  @ApiProperty({ type: MatchPlayersDto })
  players: MatchPlayersDto;

  @ApiProperty({ type: MatchGoalsDto })
  goals: MatchGoalsDto;

  @ApiProperty({ type: SubstitutionDto, isArray: true })
  substitutions: SubstitutionDto[];

  @ApiProperty({ type: BookingDto, isArray: true })
  bookings: BookingDto[];
}
