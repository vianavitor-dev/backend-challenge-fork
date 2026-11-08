import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { WalletEntity } from '../wallet/entities/WalletEntity.js';
import { WalletLedgerEntryEntity } from '../wallet/entities/WalletLedgerEntryEntity.js';
import { WagerTransactionEntity } from '../wadger/entities/WagerTransactionEntity.js';
import { InitialWallets1794000000000 } from './migrations/1794000000000-InitialWallets.js';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USERNAME ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? '123',
  database: process.env.DATABASE_NAME ?? 'postgres',
  synchronize: false,
  logging: false,
  entities: [WalletEntity, WalletLedgerEntryEntity, WagerTransactionEntity],
  subscribers: [],
  migrations: [InitialWallets1794000000000],
  migrationsRun: true,
});
