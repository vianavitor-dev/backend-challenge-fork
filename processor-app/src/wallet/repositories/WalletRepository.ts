import { ConflictException, Injectable, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { Wallet } from '../domain/Wallet.js';

interface WalletRow {
  id: string;
  player_id: string;
  currency: string;
  balance: string;
  version: number;
  created_at: Date;
  updated_at: Date;
}
function toWallet(row: WalletRow): Wallet {
  return Wallet.rehydrate({
    id: row.id,
    playerId: row.player_id,
    currency: row.currency,
    balance: { amount: row.balance, currency: row.currency },
    version: row.version,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  });
}
export interface WalletRepository {
  create(wallet: Wallet): Promise<Wallet>;
  findById(id: string): Promise<Wallet | null>;
}
export const WALLET_REPOSITORY = Symbol('WALLET_REPOSITORY');
@Injectable()
export class TypeOrmWalletRepository implements WalletRepository {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}
  async create(wallet: Wallet): Promise<Wallet> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        await manager.query(
          `INSERT INTO wallets(id,player_id,currency,balance,version) VALUES($1,$2,$3,$4,1)`,
          [
            wallet.id,
            wallet.playerId,
            wallet.currency,
            wallet.balance.toJSON().amount,
          ],
        );
        if (!wallet.balance.isZero()) {
          const id = randomUUID();
          const money = wallet.balance.toJSON();
          await manager.query(
            `INSERT INTO wager_transactions(id,provider_id,external_transaction_id,idempotency_key,payload_hash,wallet_id,player_id,round_id,game_id,kind,status,currency,money,processed_at)
            VALUES($1,'__internal',$7,$7,$2,$3,$4,'opening','opening','OPENING','PROCESSED',$5,$6,now())`,
            [
              id,
              createHash('sha256')
                .update(JSON.stringify({ walletId: wallet.id, money }))
                .digest('hex'),
              wallet.id,
              wallet.playerId,
              wallet.currency,
              money.amount,
              id,
            ],
          );
          await manager.query(
            `INSERT INTO wallet_ledgers(id,wallet_id,transaction_id,direction,currency,money,balance_before,balance_after)
            VALUES($1,$2,$3,'CREDIT',$4,$5,0,$5)`,
            [randomUUID(), wallet.id, id, wallet.currency, money.amount],
          );
        }
        return wallet;
      });
    } catch (e) {
      if (
        (e as { driverError?: { code?: string; constraint?: string } })
          .driverError?.constraint === 'uq_wallets_player_currency'
      )
        throw new ConflictException(
          'Wallet already exists for player/currency',
        );
      throw e;
    }
  }
  async findById(id: string): Promise<Wallet | null> {
    const [row] = await this.dataSource.query<WalletRow[]>(
      'SELECT * FROM wallets WHERE id=$1',
      [id],
    );
    return row ? toWallet(row) : null;
  }
}
