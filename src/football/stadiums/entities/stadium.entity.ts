import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('stadiums')
export class Stadium {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', unique: true, generated: 'increment' })
  public_id: number;

  @Column({ type: 'varchar', unique: true })
  ground: string;
}
