jest.mock('react-native-purchases', () => ({}), { virtual: true });

import { baseProductId, findPackage, PRODUCT_ANNUAL, PRODUCT_LIFETIME, PRODUCT_MONTHLY } from '../stores/subscription-store';

const pkg = (identifier: string) => ({ product: { identifier } });

describe('store product ids', () => {
  it('drops the Google Play base plan', () => {
    expect(baseProductId('habitquest_premium_monthly:monthly')).toBe(PRODUCT_MONTHLY);
    expect(baseProductId(PRODUCT_ANNUAL)).toBe(PRODUCT_ANNUAL);
  });

  it('finds packages with App Store and Google Play ids', () => {
    const offering = {
      availablePackages: [pkg('habitquest_premium_monthly:monthly'), pkg('habitquest_premium_annual:annual'), pkg(PRODUCT_LIFETIME)],
    };
    expect(findPackage(offering, PRODUCT_MONTHLY)).toBe(offering.availablePackages[0]);
    expect(findPackage(offering, PRODUCT_ANNUAL)).toBe(offering.availablePackages[1]);
    expect(findPackage(offering, PRODUCT_LIFETIME)).toBe(offering.availablePackages[2]);
    expect(findPackage({ availablePackages: [pkg(PRODUCT_ANNUAL)] }, PRODUCT_ANNUAL)).toBeTruthy();
    expect(findPackage(null, PRODUCT_ANNUAL)).toBeUndefined();
  });
});
