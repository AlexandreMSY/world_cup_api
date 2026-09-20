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

@Entity('substitutions')
@Index('IDX_substitutions_match_id', ['match'])
@Index('IDX_substitutions_player_out_id', ['playerOut'])
@Index('IDX_substitutions_player_in_id', ['playerIn'])
export class Substitution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Match, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @ManyToOne(() => Team, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @ManyToOne(() => Player, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'player_out_id' })
  playerOut: Player;

  @ManyToOne(() => Player, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'player_in_id' })
  playerIn: Player;

  @Column({ type: 'integer', nullable: true })
  minute: number | null;

  @Column({ type: 'integer', nullable: true })
  added_time: number | null;
}
