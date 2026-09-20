import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Team } from '../../teams/entities/team.entity.js';
import { Tournament } from './tournament.entity.js';

@Entity('tournament_teams')
@Unique('UQ_tournament_teams_tournament_team', ['tournament', 'team'])
@Index('IDX_tournament_teams_team_id', ['team'])
export class TournamentTeam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tournament, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @ManyToOne(() => Team, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ type: 'varchar', nullable: true })
  group_name: string | null;
}
