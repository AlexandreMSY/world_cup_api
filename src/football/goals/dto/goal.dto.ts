import { ApiProperty } from '@nestjs/swagger';
import { BasicTeamDto } from '../../matches/dto/match-summary.dto.js';

export class BasicPlayerDto {
  @ApiProperty()
  slug: string;

  @ApiProperty()
  name: string;
}

export class GoalDto {
  @ApiProperty({ type: BasicTeamDto })
  team: BasicTeamDto;

  @ApiProperty({ type: BasicPlayerDto })
  player: BasicPlayerDto;

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
  @ApiProperty()
  slug: string;

  @ApiProperty()
  round: string;

  @ApiProperty({ format: 'date' })
  date: string;

  @ApiProperty({ type: BasicTeamDto })
  homeTeam: BasicTeamDto;

  @ApiProperty({ type: BasicTeamDto })
  awayTeam: BasicTeamDto;
}

export class PlayerGoalDto extends GoalDto {
  @ApiProperty({ type: BasicGoalMatchDto })
  match: BasicGoalMatchDto;
}
