import { describe, expect, it } from 'bun:test';
import { Wallet } from './Wallet.js';
import { Money } from './Money.js';

const money = (amount: string) => Money.from({ amount, currency: 'BRL' });
const open = (amount = '100') =>
  Wallet.open({
    id: 'wallet',
    playerId: 'player',
    initialBalance: money(amount),
  });
describe('Wallet', () => {
  it('opens even with zero balance, always at version 1', () => {
    expect(open('0').version).toBe(1);
    expect(() =>
      Wallet.open({
        id: 'w',
        playerId: 'p',
        initialBalance: money('1').negate(),
      }),
    ).toThrow();
  });
  it('changes the version only when the balance changes', () => {
    const wallet = open();
    wallet.debit(money('80'));
    expect(wallet.balance.toJSON().amount).toBe('20.00');
    expect(wallet.version).toBe(2);
    wallet.credit(money('0'));
    wallet.debit(money('0'));
    expect(wallet.version).toBe(2);
    wallet.credit(money('10'));
    expect(wallet.version).toBe(3);
  });
  it('rejects insufficient balance and currency mismatch without changing state', () => {
    const wallet = open();
    expect(() => wallet.debit(money('101'))).toThrow();
    expect(() =>
      wallet.credit(Money.from({ amount: '1', currency: 'USD' })),
    ).toThrow();
    expect(wallet.balance.toJSON().amount).toBe('100.00');
    expect(wallet.version).toBe(1);
  });
  it('rehydrates persisted state instead of opening again', () => {
    const wallet = Wallet.rehydrate({
      id: 'w',
      playerId: 'p',
      currency: 'BRL',
      balance: { amount: '20.00', currency: 'BRL' },
      version: 7,
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-02T00:00:00Z',
    });
    expect(wallet.version).toBe(7);
    expect(wallet.balance.toJSON().amount).toBe('20.00');
  });
});
