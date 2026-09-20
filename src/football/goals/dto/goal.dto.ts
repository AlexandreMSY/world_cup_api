import { ApiProperty } from '@nestjs/swagger';
import {
  BasicTeamDto,
  BasicTournamentDto,
  MatchScoreDto,
} from '../../matches/dto/match-summary.dto.js';

export class GoalDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: BasicTeamDto })
  team: BasicTeamDto;

  @ApiProperty({ type: String })
  player: { id: string; name: string };

  @ApiProperty({ nullable: true, type: Number })
  minute: number | null;

  @ApiProperty({ nullable: true, type: Number })
  addedTime: number | null;

  @ApiProperty()
  penalty: boolean;

  @ApiProperty()
  ownGoal: boolean;
}

export class BasicGoalMatchDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

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
}

export class PlayerGoalDto extends GoalDto {
  @ApiProperty({ type: BasicGoalMatchDto })
  match: BasicGoalMatchDto;
}
