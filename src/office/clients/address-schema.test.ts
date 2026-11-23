import { addressErrors, addressSchema, emptyAddress } from './address-schema';

describe('address schema (02, R2)', () => {
  it('requires street, city and state; blank counts as empty', () => {
    expect(Object.keys(addressErrors({ ...emptyAddress, street: '  ' })).sort()).toEqual(['city', 'state', 'street']);
  });

  it('accepts an address with only the required fields', () => {
    const address = { ...emptyAddress, street: 'Rua A', city: 'Curitiba', state: 'PR' };

    expect(addressErrors(address)).toEqual({});
    expect(addressSchema.safeParse(address).success).toBe(true);
  });
});
