import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Money } from './domain/Money.js';
import { Wallet } from './domain/Wallet.js';
import {
  WALLET_REPOSITORY,
  type WalletRepository,
} from './repositories/WalletRepository.js';

@Injectable()
export class WalletService {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: WalletRepository,
  ) {}

  async create(input: unknown): Promise<Wallet> {
    if (
      !this.isRecord(input) ||
      typeof input.playerId !== 'string' ||
      input.playerId.trim().length === 0 ||
      !this.isRecord(input.initialBalance) ||
      typeof input.initialBalance.amount !== 'string' ||
      typeof input.initialBalance.currency !== 'string'
    ) {
      throw new BadRequestException(
        'playerId and initialBalance amount/currency are required',
      );
    }

    let initialBalance: Money;
    try {
      initialBalance = Money.from({
        amount: input.initialBalance.amount,
        currency: input.initialBalance.currency,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    return this.walletRepository.create(
      Wallet.open({
        id: randomUUID(),
        playerId: input.playerId.trim(),
        initialBalance,
      }),
    );
  }

  async findById(id: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findById(id);
    if (!wallet) {
      throw new NotFoundException(`Wallet ${id} was not found`);
    }
    return wallet;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
