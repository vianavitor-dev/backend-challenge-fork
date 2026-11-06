import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'wallets' })
@Unique('uq_wallets_player_currency', ['playerId', 'currency'])
export class WalletEntity {
    @PrimaryColumn('uuid')
    id: string;

    @Column({ type: 'varchar' })
    playerId: string;

    @Column({ type: 'varchar', length: 3 })
    currency: string;

    @Column({ type: 'numeric', precision: 20, scale: 2 })
    balance: string;

    @Column({ type: 'integer' })
    version: number;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}