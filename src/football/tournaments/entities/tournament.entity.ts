import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('tournaments')
@Unique('UQ_tournaments_name_year', ['name', 'year'])
export class Tournament {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'integer' })
  year: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  host: string | null;

  @Column({ type: 'date', nullable: true })
  start_date: string | null;

  @Column({ type: 'date', nullable: true })
  end_date: string | null;
}
