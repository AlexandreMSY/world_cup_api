import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Stadium } from '../../stadiums/entities/stadium.entity.js';
import { Team } from '../../teams/entities/team.entity.js';
import { Tournament } from '../../tournaments/entities/tournament.entity.js';

@Entity('matches')
@Unique('UQ_matches_tournament_date_teams', [
  'tournament',
  'match_date',
  'homeTeam',
  'awayTeam',
])
@Check('CHK_matches_different_teams', '"home_team_id" <> "away_team_id"')
@Index('IDX_matches_home_team_id', ['homeTeam'])
@Index('IDX_matches_away_team_id', ['awayTeam'])
@Index('IDX_matches_stadium_id', ['stadium'])
@Index('IDX_matches_match_date', ['match_date'])
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @ManyToOne(() => Tournament, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @ManyToOne(() => Stadium, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'stadium_id' })
  stadium: Stadium | null;

  @ManyToOne(() => Team, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'home_team_id' })
  homeTeam: Team;

  @ManyToOne(() => Team, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'away_team_id' })
  awayTeam: Team;

  @Column({ type: 'varchar' })
  round: string;

  @Column({ type: 'date' })
  match_date: string;

  @Column({ type: 'time', nullable: true })
  kickoff_time: string | null;

  @Column({ type: 'integer', nullable: true })
  home_score: number | null;

  @Column({ type: 'integer', nullable: true })
  away_score: number | null;

  @Column({ type: 'integer', nullable: true })
  home_score_et: number | null;

  @Column({ type: 'integer', nullable: true })
  away_score_et: number | null;

  @Column({ type: 'integer', nullable: true })
  home_score_penalties: number | null;

  @Column({ type: 'integer', nullable: true })
  away_score_penalties: number | null;
}
