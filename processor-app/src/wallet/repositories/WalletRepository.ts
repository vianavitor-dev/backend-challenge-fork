import { ConflictException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { Wallet } from '../domain/Wallet.js';
import { WalletEntity } from '../entities/WalletEntity.js';

export interface WalletRepository {
  create(wallet: Wallet): Promise<Wallet>;
  findById(id: string): Promise<Wallet | null>;
  save(wallet: Wallet): Promise<Wallet>;
}

export const WALLET_REPOSITORY = Symbol('WALLET_REPOSITORY');

@Injectable()
export class TypeOrmWalletRepository implements WalletRepository, OnModuleDestroy {
  private readonly repository: Repository<WalletEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repository = dataSource.getRepository(WalletEntity);
  }

  async create(wallet: Wallet): Promise<Wallet> {
    try {
      const entity = await this.repository.query<WalletEntity>(
        "INSERT INTO wallets (id, player_id, currency, balance, version, created_at, updated_at)" +
        " VALUES ($1, $2, $3, $4, $5 + 1, $6, $7)" +
        " WHERE version = $5", [
          wallet.id,
          wallet.playerId,
          wallet.currency,
          wallet.balance,
          wallet.version, // Increment version for new wallet
          wallet.createdAt,
          wallet.updatedAt,
      ]);
      return this.toDomain(entity);
    } catch (error) {
      this.throwIfDuplicateWallet(error);
      throw error;
    }
  }

  async findById(id: string): Promise<Wallet | null> {
    const entity = await this.repository.findOneBy({ id });
    return entity ? this.toDomain(entity) : null;
  }

  async save(wallet: Wallet): Promise<Wallet> {
    try {
      const entity = await this.repository.query<WalletEntity>(
        "INSERT INTO wallets (id, player_id, currency, balance, version, created_at, updated_at)" +
        " VALUES ($1, $2, $3, $4, $5 + 1, $6, $7)" +
        " WHERE version = $5", [
          wallet.id,
          wallet.playerId,
          wallet.currency,
          wallet.balance,
          wallet.version, // Increment version for new wallet
          wallet.createdAt,
          wallet.updatedAt,
      ]);
      return this.toDomain(entity);
    } catch (error) {
      this.throwIfDuplicateWallet(error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }

  private toEntity(wallet: Wallet): WalletEntity {
    return this.repository.create({
      id: wallet.id,
      playerId: wallet.playerId,
      currency: wallet.currency,
      balance: wallet.balance.toJSON().amount,
      version: wallet.version,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    });
  }

  private toDomain(entity: WalletEntity): Wallet {
    return Wallet.rehydrate({
      id: entity.id,
      playerId: entity.playerId,
      currency: entity.currency,
      balance: { amount: entity.balance, currency: entity.currency },
      version: entity.version,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    });
  }

  private throwIfDuplicateWallet(error: unknown): void {
    if (
      error instanceof QueryFailedError &&
      typeof error.driverError === 'object' &&
      error.driverError !== null &&
      'code' in error.driverError &&
      error.driverError.code === '23505' &&
      'constraint' in error.driverError &&
      error.driverError.constraint === 'uq_wallets_player_currency'
    ) {
      throw new ConflictException(
        'A wallet already exists for this player and currency',
      );
    }
  }
}
