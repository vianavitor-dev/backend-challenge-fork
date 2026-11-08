import { Decimal } from 'decimal.js';

interface MoneyProps {
  amount: string; // decimal string, ex.: "25.00"
  currency: string; // ISO-4217
}

const ExactDecimal = Decimal.clone({ precision: 50 });

class Money {
  private constructor(
    private readonly value: Decimal,
    public readonly currency: string,
  ) {
    Object.freeze(this);
  }

  static from(props: MoneyProps): Money {
    const { amount, currency } = props;

    if (amount === undefined || currency === undefined || amount === '') {
      throw new Error('Amount and currency must be defined');
    }

    if (typeof amount !== 'string' || typeof currency !== 'string') {
      throw new Error('Amount and currency must be strings');
    }

    if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
      throw new Error(
        'Amount must be a valid decimal string with up to two decimal places',
      );
    }

    if (!['BRL', 'USD', 'EUR'].includes(currency)) {
      throw new Error('Unsupported currency');
    }

    if (new ExactDecimal(amount).greaterThan('999999999999999999.99')) {
      throw new Error('Amount exceeds NUMERIC(20,2) capacity');
    }
    return new Money(new ExactDecimal(amount), currency);
  }

  static zero(currency: string): Money {
    if (!['BRL', 'USD', 'EUR'].includes(currency)) {
      throw new Error('Unsupported currency');
    }

    return new Money(new ExactDecimal('0'), currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);

    return new Money(this.value.plus(other.value), this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);

    return new Money(this.value.minus(other.value), this.currency);
  }
  negate(): Money {
    return new Money(this.value.negated(), this.currency);
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  isPositive(): boolean {
    return this.value.greaterThan('0');
  }

  isNegative(): boolean {
    return this.value.isNegative();
  }

  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);

    return this.value.lessThan(other.value);
  }

  equals(other: Money): boolean {
    return this.value.equals(other.value) && this.currency === other.currency;
  }

  toJSON(): MoneyProps {
    return {
      amount: this.value.toFixed(2),
      currency: this.currency,
    };
  }
  toString(): string {
    return `${this.value.toFixed(2)} ${this.currency}`;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(
        `Cannot operate on Money with different currencies: ${this.currency} vs ${other.currency}`,
      );
    }
  }
}

export { Money };
export type { MoneyProps };
