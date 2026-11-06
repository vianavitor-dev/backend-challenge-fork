import { Money } from './Money.js';
import type { MoneyProps } from './Money.js';

interface WalletState {
  id: string;
  playerId: string;
  currency: string;
  balance: MoneyProps;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export class Wallet {
  private constructor(
    public readonly id: string,
    public readonly playerId: string,
    public readonly currency: string,
    private _balance: Money,
    private _version: number,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static open(props: {
    id: string;
    playerId: string;
    initialBalance: Money;
  }): Wallet {
    const { id, playerId, initialBalance } = props;

    if (initialBalance.isLessThan(Money.zero(initialBalance.currency))) {
      throw new Error("Initial balance cannot be less than zero");
    }

    return new Wallet(
      id,
      playerId,
      initialBalance.currency,
      initialBalance,
      initialBalance.isZero() ? 0 : 1,
      new Date(),
      new Date(),
    );
  }

  /** Reconstrução a partir da persistência — não revalida transições. */
  static rehydrate(state: WalletState): Wallet {
    const { id, playerId, currency, balance, version, createdAt, updatedAt } = state;
    return new Wallet(
      id,
      playerId,
      currency,
      Money.from(balance),
      version,
      new Date(createdAt),
      new Date(updatedAt),
    );
  }

  get balance(): Money { return this._balance; }
  get version(): number { return this._version; }
  get updatedAt(): Date { return this._updatedAt; }

  // Aplicam a movimentação mantendo saldo e ledger consistentes entre si.
  // Assinatura e retorno são decisão sua.
  // Retorno não é necessário
  debit(amount: Money): void {
    this.assertSameCurrency(amount);
    if (amount.isNegative()) {
      throw new Error("Cannot debit a negative amount");
    }

    if (this._balance.isLessThan(amount)) {
      throw new Error("Insufficient balance");
    }

    this._balance = this._balance.subtract(amount);
    // this._version += 1;
    this._updatedAt = new Date();
  }

  credit(amount: Money): void {
    this.assertSameCurrency(amount);
    if (amount.isNegative()) {
      throw new Error("Cannot credit a negative amount");
    }

    this._balance = this._balance.add(amount);
    // this._version += 1;
    this._updatedAt = new Date();
  }

  private assertSameCurrency(money: Money): void {
    if (this.currency !== money.currency) {
      throw new Error(`Currency mismatch: wallet is ${this.currency}, but money is ${money.currency}`);
    }
  }
}