import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  key_hash: string;

  @Column({ length: 64, nullable: true, unique: true })
  key_fingerprint: string | null;

  @CreateDateColumn()
  created_at: Date;

  @Column({ default: true })
  active: boolean;
}
