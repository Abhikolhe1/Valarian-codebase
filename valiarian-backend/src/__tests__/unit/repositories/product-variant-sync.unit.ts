import {strict as assert} from 'assert';
import {OrderController} from '../../../controllers/order.controller';
import {Product, ProductVariant} from '../../../models';
import {ProductRepository} from '../../../repositories';

describe('ProductRepository normalized variant synchronization', () => {
  it('updates existing rows, creates new rows, and removes deleted variants', async () => {
    const existing = [
      new ProductVariant({
        id: 'variant-existing',
        productId: 'product-1',
        sku: 'OLD-S',
        color: '#000000',
        colorName: 'Black',
        size: 'S',
        stockQuantity: 0,
        reservedQuantity: 3,
      }),
      new ProductVariant({
        id: 'variant-deleted',
        productId: 'product-1',
        sku: 'OLD-M',
        color: '#000000',
        colorName: 'Black',
        size: 'M',
        stockQuantity: 2,
        reservedQuantity: 0,
      }),
    ];
    const updates: Array<{id: string; data: Partial<ProductVariant>}> = [];
    const creates: ProductVariant[] = [];
    const deletes: string[] = [];
    const variantRepository = {
      find: async () => existing,
      updateById: async (id: string, data: Partial<ProductVariant>) => {
        updates.push({id, data});
      },
      create: async (data: ProductVariant) => {
        creates.push(data);
        return data;
      },
      deleteById: async (id: string) => {
        deletes.push(id);
      },
    };
    const repository = Object.assign(
      Object.create(ProductRepository.prototype),
      {
        productVariantRepositoryGetter: async () => variantRepository,
      },
    ) as ProductRepository;

    await repository.syncNormalizedVariants('product-1', [
      new ProductVariant({
        id: 'variant-existing',
        sku: 'NEW-S',
        color: '#ffffff',
        colorName: 'White',
        size: 'S',
        stockQuantity: 10,
        inStock: true,
        isDefault: true,
      }),
      new ProductVariant({
        id: 'variant-new',
        sku: 'NEW-M',
        color: '#ffffff',
        colorName: 'White',
        size: 'M',
        stockQuantity: 7,
        inStock: true,
      }),
    ]);

    assert.equal(updates.length, 1);
    assert.equal(updates[0].id, 'variant-existing');
    assert.equal(updates[0].data.stockQuantity, 10);
    assert.equal(updates[0].data.inStock, true);
    assert.equal(creates.length, 1);
    assert.equal(creates[0].id, 'variant-new');
    assert.equal(creates[0].stockQuantity, 7);
    assert.equal(creates[0].reservedQuantity, 0);
    assert.deepEqual(deletes, ['variant-deleted']);
  });
});

describe('Order checkout variant inventory', () => {
  it('uses the storefront variant stock when an old normalized row is stale', async () => {
    let normalizedReads = 0;
    const product = new Product({
      id: 'product-1',
      name: 'Purchasable product',
      status: 'published',
      stockQuantity: 10,
      price: 699,
      variants: [
        new ProductVariant({
          id: 'variant-1',
          sku: 'PRODUCT-S',
          color: '#ffffff',
          colorName: 'White',
          size: 'S',
          stockQuantity: 10,
          inStock: true,
        }),
      ],
    });
    const controller = Object.assign(Object.create(OrderController.prototype), {
      productRepository: {findById: async () => product},
      productVariantRepository: {
        findById: async () => {
          normalizedReads++;
          return new ProductVariant({id: 'variant-1', stockQuantity: 0});
        },
      },
      validateAppliedCoupon: async () => null,
    }) as OrderController;
    const draftBuilder = controller as unknown as {
      buildOrderDraft: (
        request: {
          cartItems: Array<{
            productId: string;
            variantId: string;
            quantity: number;
            price: number;
          }>;
          paymentMethod: 'razorpay';
          shippingAddress: {state: string};
          billingAddress: {state: string};
          shipping: number;
        },
        userId: string,
      ) => Promise<{orderItems: Array<{quantity: number}>; total: number}>;
    };

    const draft = await draftBuilder.buildOrderDraft(
      {
        cartItems: [
          {
            productId: 'product-1',
            variantId: 'variant-1',
            quantity: 1,
            price: 699,
          },
        ],
        paymentMethod: 'razorpay',
        shippingAddress: {state: 'Maharashtra'},
        billingAddress: {state: 'Maharashtra'},
        shipping: 0,
      },
      'user-1',
    );

    assert.equal(draft.orderItems[0].quantity, 1);
    assert.equal(draft.total, 699);
    assert.equal(normalizedReads, 0);
  });
});
