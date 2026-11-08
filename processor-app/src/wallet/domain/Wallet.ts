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
  private readonly _previousVersion: number;

  private constructor(
    public readonly id: string,
    public readonly playerId: string,
    public readonly currency: string,
    private _balance: Money,
    private _version: number,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {
    this._previousVersion = _version;
  }

  static open(props: {
    id: string;
    playerId: string;
    initialBalance: Money;
  }): Wallet {
    const { id, playerId, initialBalance } = props;

    if (initialBalance.isNegative()) {
      throw new Error('Initial balance cannot be less than zero');
    }

    return new Wallet(
      id,
      playerId,
      initialBalance.currency,
      initialBalance,
      1,
      new Date(),
      new Date(),
    );
  }

  /** Reconstrução a partir da persistência — não revalida transições. */
  static rehydrate(state: WalletState): Wallet {
    const { id, playerId, currency, balance, version, createdAt, updatedAt } =
      state;
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

  get previousVersion(): number {
    return this._previousVersion;
  }
  get balance(): Money {
    return this._balance;
  }
  get version(): number {
    return this._version;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Alteram apenas o domínio. A persistência de saldo e ledger deve ser atômica.
  debit(amount: Money): void {
    this.assertSameCurrency(amount);
    if (amount.isNegative()) {
      throw new Error('Cannot debit a negative amount');
    }

    if (this._balance.isLessThan(amount)) {
      throw new Error('Insufficient balance');
    }

    if (amount.isZero()) return;
    this._balance = this._balance.subtract(amount);
    this._version += 1;
    this._updatedAt = new Date();
  }

  credit(amount: Money): void {
    this.assertSameCurrency(amount);
    if (amount.isNegative()) {
      throw new Error('Cannot credit a negative amount');
    }

    if (amount.isZero()) return;
    this._balance = this._balance.add(amount);
    this._version += 1;
    this._updatedAt = new Date();
  }

  private assertSameCurrency(money: Money): void {
    if (this.currency !== money.currency) {
      throw new Error(
        `Currency mismatch: wallet is ${this.currency}, but money is ${money.currency}`,
      );
    }
  }
}
