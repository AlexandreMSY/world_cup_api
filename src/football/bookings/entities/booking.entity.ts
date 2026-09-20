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

export enum CardType {
  YELLOW = 'yellow',
  SECOND_YELLOW = 'second_yellow',
  RED = 'red',
}

@Entity('bookings')
@Index('IDX_bookings_match_id', ['match'])
@Index('IDX_bookings_player_id', ['player'])
export class Booking {
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

  @Column({ type: 'enum', enum: CardType, enumName: 'card_type_enum' })
  card_type: CardType;

  @Column({ type: 'integer', nullable: true })
  minute: number | null;

  @Column({ type: 'integer', nullable: true })
  added_time: number | null;
}
