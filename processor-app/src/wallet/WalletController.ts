import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Wallet } from './domain/Wallet.js';
import { WalletService } from './WalletService.js';

@Controller('wallets')
export class WalletController {
  constructor(
    @Inject(WalletService) private readonly walletService: WalletService,
  ) {}

  @Post()
  async create(@Body() body: unknown): Promise<WalletResponse> {
    return this.toResponse(await this.walletService.create(body));
  }

  @Get(':walletId')
  async findById(
    @Param('walletId', new ParseUUIDPipe()) walletId: string,
  ): Promise<WalletResponse> {
    return this.toResponse(await this.walletService.findById(walletId));
  }

  private toResponse(wallet: Wallet): WalletResponse {
    return {
      id: wallet.id,
      playerId: wallet.playerId,
      balance: wallet.balance.toJSON(),
      version: wallet.version,
    };
  }
}

interface WalletResponse {
  id: string;
  playerId: string;
  balance: { amount: string; currency: string };
  version: number;
}
