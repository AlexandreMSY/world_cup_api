import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('stadiums')
export class Stadium {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  ground: string;
}
