import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppDataSource } from '../database/data-source.js';
import {
  TypeOrmWalletRepository,
  WALLET_REPOSITORY,
} from './repositories/WalletRepository.js';
import { WalletController } from './WalletController.js';
import { WalletService } from './WalletService.js';

@Module({
  controllers: [WalletController],
  providers: [
    {
      provide: DataSource,
      useFactory: async () => {
        if (!AppDataSource.isInitialized) {
          await AppDataSource.initialize();
        }
        return AppDataSource;
      },
    },
    {
      provide: WALLET_REPOSITORY,
      useFactory: (dataSource: DataSource) =>
        new TypeOrmWalletRepository(dataSource),
      inject: [DataSource],
    },
    WalletService,
  ],
})
export class WalletModule {}
