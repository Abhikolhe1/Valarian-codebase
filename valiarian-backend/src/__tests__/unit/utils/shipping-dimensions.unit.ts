import {strict as assert} from 'assert';
import {
  calculateOrderShippingDimensions,
  getDefaultDimensions,
} from '../../../utils/shipping-dimensions.utils';

describe('shipping dimensions', () => {
  const originalEnvironment = {...process.env};

  afterEach(() => {
    process.env = {...originalEnvironment};
  });

  it('uses neutral shipping defaults before legacy Blue Dart defaults', () => {
    process.env.SHIPPING_DEFAULT_WEIGHT_GRAMS = '425';
    process.env.SHIPPING_DEFAULT_LENGTH_CM = '35';
    process.env.SHIPPING_DEFAULT_BREADTH_CM = '34';
    process.env.SHIPPING_DEFAULT_HEIGHT_CM = '3';
    process.env.BLUEDART_DEFAULT_WEIGHT_GRAMS = '999';

    assert.deepEqual(getDefaultDimensions(), {
      weightGrams: 425,
      lengthCm: 35,
      breadthCm: 34,
      heightCm: 3,
      volumetricDivisor: 5000,
    });
  });

  it('multiplies dead weight by item quantity', () => {
    const result = calculateOrderShippingDimensions([{
      productId: 'polo',
      quantity: 3,
      productDimensions: {
        weightGrams: 425,
        lengthCm: 35,
        breadthCm: 34,
        heightCm: 3,
      },
    }]);

    assert.equal(result.deadWeightGrams, 1275);
    assert.equal(result.lengthCm, 35);
    assert.equal(result.breadthCm, 34);
    assert.equal(result.heightCm, 3);
  });
});
