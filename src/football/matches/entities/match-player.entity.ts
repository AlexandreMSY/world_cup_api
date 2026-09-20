import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Player } from '../../players/entities/player.entity.js';
import { Team } from '../../teams/entities/team.entity.js';
import { Match } from './match.entity.js';

@Entity('match_players')
@Unique('UQ_match_players_match_player', ['match', 'player'])
@Index('IDX_match_players_player_id', ['player'])
@Index('IDX_match_players_team_id', ['team'])
export class MatchPlayer {
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

  @Column({ type: 'boolean' })
  starter: boolean;

  @Column({ type: 'varchar', nullable: true })
  position: string | null;

  @Column({ type: 'integer', nullable: true })
  shirt_number: number | null;

  @Column({ type: 'boolean', default: false })
  captain: boolean;
}
