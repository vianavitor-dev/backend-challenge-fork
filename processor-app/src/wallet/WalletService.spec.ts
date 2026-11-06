import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Money } from './domain/Money.js';
import { Wallet } from './domain/Wallet.js';
import type { WalletRepository } from './repositories/WalletRepository.js';
import { WalletService } from './WalletService.js';

describe('WalletService', () => {
  const createWallet = vi.fn(async (wallet: Wallet) => wallet);
  const findWalletById = vi.fn(
    async (_id: string): Promise<Wallet | null> => null,
  );
  const saveWallet = vi.fn(async (wallet: Wallet) => wallet);
  let walletRepository: WalletRepository;
  let walletService: WalletService;

  beforeEach(() => {
    createWallet.mockClear();
    findWalletById.mockClear();
    findWalletById.mockResolvedValue(null);
    saveWallet.mockClear();
    walletRepository = {
      create: createWallet,
      findById: findWalletById,
      save: saveWallet,
    };
    walletService = new WalletService(walletRepository);
  });

  it('creates and persists a wallet with its initial balance', async () => {
    const wallet = await walletService.create({
      playerId: 'player-1',
      initialBalance: { amount: '1000.00', currency: 'BRL' },
    });

    expect(wallet.playerId).toBe('player-1');
    expect(wallet.balance.toJSON()).toEqual({
      amount: '1000.00',
      currency: 'BRL',
    });
    expect(wallet.version).toBe(1);
    expect(createWallet).toHaveBeenCalledWith(wallet);
  });

  it('rejects invalid wallet input', async () => {
    await expect(
      walletService.create({
        playerId: 'player-1',
        initialBalance: { amount: '-1.00', currency: 'BRL' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns a persisted wallet by id', async () => {
    const wallet = Wallet.open({
      id: 'wallet-1',
      playerId: 'player-1',
      initialBalance: Money.from({ amount: '10.00', currency: 'BRL' }),
    });
    findWalletById.mockResolvedValue(wallet);

    await expect(walletService.findById(wallet.id)).resolves.toBe(wallet);
  });

  it('returns not found when the wallet does not exist', async () => {
    await expect(walletService.findById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
