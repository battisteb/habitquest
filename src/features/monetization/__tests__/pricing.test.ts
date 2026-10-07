import { FALLBACK_PRICES, annualPerMonth, annualSavingsPercent, formatPrice } from '../utils/pricing';

describe('pricing', () => {
  it('falls back to the dollar prices', () => {
    expect(FALLBACK_PRICES).toEqual({ monthly: 3.99, annual: 24.99, lifetime: 49.99, currency: 'USD' });
  });

  it('formats in the store currency and the player language', () => {
    expect(formatPrice(5.99, 'USD', 'en')).toBe('$5.99');
    expect(formatPrice(4.99, 'EUR', 'fr').replace(/\s/g, ' ')).toBe('4,99 €');
  });

  it('computes the monthly cost of the annual plan', () => {
    expect(annualPerMonth(39.99)).toBe(3.33);
  });

  it('computes the saving from the real prices', () => {
    expect(annualSavingsPercent(5.99, 39.99)).toBe(44);
    expect(annualSavingsPercent(4.99, 34.99)).toBe(42);
    expect(annualSavingsPercent(0, 10)).toBe(0);
  });
});
