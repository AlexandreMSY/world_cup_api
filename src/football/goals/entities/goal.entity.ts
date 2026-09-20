import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Match } from '../../matches/entities/match.entity.js';
import { Player } from '../../players/entities/player.entity.js';
import { Team } from '../../teams/entities/team.entity.js';

@Entity('goals')
@Index('IDX_goals_match_id', ['match'])
@Index('IDX_goals_player_id', ['player'])
@Index('IDX_goals_team_id', ['team'])
export class Goal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Match, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @ManyToOne(() => Player, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @ManyToOne(() => Team, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ type: 'integer', nullable: true })
  minute: number | null;

  @Column({ type: 'integer', nullable: true })
  added_time: number | null;

  @Column({ type: 'boolean', default: false })
  penalty: boolean;

  @Column({ type: 'boolean', default: false })
  own_goal: boolean;
}
