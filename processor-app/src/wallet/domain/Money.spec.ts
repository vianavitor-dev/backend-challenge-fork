import { describe, expect, it } from 'bun:test';
import { Money } from './Money.js';

describe('Money', () => {
  const money = (amount: string, currency = 'BRL') =>
    Money.from({ amount, currency });
  it('normalizes the scale and calculates without floating point errors', () => {
    expect(money('0.1').add(money('0.2')).toJSON().amount).toBe('0.30');
    expect(money('25').toJSON().amount).toBe('25.00');
    expect(
      money('999999999999999999.98').add(money('0.01')).toJSON().amount,
    ).toBe('999999999999999999.99');
  });
  it('does not mutate operands and supports internal negative results', () => {
    const original = money('1');
    expect(original.subtract(money('2')).toJSON().amount).toBe('-1.00');
    expect(original.negate().toJSON().amount).toBe('-1.00');
    expect(original.toJSON().amount).toBe('1.00');
    expect(Money.zero('BRL').isPositive()).toBe(false);
  });
  it('rejects invalid input instead of rounding', () => {
    for (const amount of [
      '',
      'NaN',
      'Infinity',
      '1e3',
      '1.001',
      '-1',
      ' 1 ',
      '1000000000000000000',
    ]) {
      expect(() => money(amount)).toThrow();
    }
    expect(() => money(10 as unknown as string)).toThrow();
    expect(() => Money.zero('INVALID')).toThrow();
  });
  it('rejects mixed currencies', () => {
    expect(() => money('1').add(money('1', 'USD'))).toThrow();
    expect(() => money('1').subtract(money('1', 'EUR'))).toThrow();
    expect(() => money('1').isLessThan(money('1', 'USD'))).toThrow();
  });
});
