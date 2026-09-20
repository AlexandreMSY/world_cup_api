import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', unique: true, generated: 'increment' })
  public_id: number;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  code: string | null;
}
