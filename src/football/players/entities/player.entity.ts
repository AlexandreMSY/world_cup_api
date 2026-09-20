import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Team } from '../../teams/entities/team.entity.js';

@Entity('players')
@Unique('UQ_players_team_name', ['team', 'name'])
export class Player {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', unique: true, generated: 'increment' })
  public_id: number;

  @ManyToOne(() => Team, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ type: 'varchar' })
  name: string;
}
