import { buildEcommerceParameters, toAnalyticsItem } from './analytics';

describe('GA4 ecommerce analytics', () => {
  it('maps storefront cart data to prescribed GA4 item fields without customer data', () => {
    const item = toAnalyticsItem({
      productId: 'product-1',
      name: 'Classic Tee',
      category: { name: 'T-Shirts' },
      variantId: 'variant-1',
      colors: ['Black'],
      size: 'M',
      price: 1499,
      quantity: 2,
      email: 'customer@example.com',
    });

    expect(item).toEqual({
      item_id: 'product-1',
      item_name: 'Classic Tee',
      affiliation: 'Valiarian online store',
      item_brand: 'Valiarian',
      item_category: 'T-Shirts',
      item_variant: 'variant-1 / Black / M',
      price: 1499,
      quantity: 2,
    });
    expect(item).not.toHaveProperty('email');
  });

  it('uses INR and calculates event value from item price and quantity', () => {
    expect(
      buildEcommerceParameters([
        { id: 'one', name: 'One', price: 100, quantity: 2 },
        { id: 'two', name: 'Two', price: 50, quantity: 1 },
      ])
    ).toMatchObject({
      currency: 'INR',
      value: 250,
    });
  });
});
