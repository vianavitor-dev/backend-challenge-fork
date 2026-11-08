import {
  Column,
  CreateDateColumn,
  Entity,
  Check,
  PrimaryColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'wallets' })
@Unique('uq_wallets_player_currency', ['playerId', 'currency'])
@Check('ck_wallets_balance_non_negative', '"balance" >= 0')
@Check('ck_wallets_version_positive', '"version" >= 1')
export class WalletEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'varchar' })
  playerId: string;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'numeric', precision: 20, scale: 2 })
  balance: string;

  @Column({ type: 'integer' })
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
