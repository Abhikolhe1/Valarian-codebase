import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {del, get, HttpErrors, param, patch, post, requestBody} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {v4 as uuidv4} from 'uuid';
import {authorize} from '../authorization';
import {Product, ProductVariant} from '../models';
import {CartItemsRepository, CartsRepository, ProductRepository} from '../repositories';

interface AddToCartRequest {
  productId: string;
  variantId?: string;
  quantity: number;
}

interface UpdateCartItemRequest {
  quantity: number;
}

const MAX_CART_ITEM_QUANTITY = 10;

export class CartController {
  constructor(
    @repository(CartsRepository)
    public cartsRepository: CartsRepository,
    @repository(CartItemsRepository)
    public cartItemsRepository: CartItemsRepository,
    @repository(ProductRepository)
    public productsRepository: ProductRepository,
  ) { }

  private async getPurchasableStock(
    product: Product,
    productId: string,
    variantId?: string,
  ): Promise<{variant: ProductVariant | null; available: number}> {
    const embeddedVariants = product.variants ?? [];

    if (variantId) {
      const normalizedVariant = await this.productsRepository.getVariant(productId, variantId);
      const variant = normalizedVariant ?? embeddedVariants.find(item => item.id === variantId);

      if (!variant || variant.isDeleted || variant.isActive === false) {
        throw new HttpErrors.BadRequest('Selected product variant is not available');
      }

      const available = Math.max(0, Number(variant.stockQuantity) || 0);
      return {variant, available: variant.inStock === false ? 0 : available};
    }

    if (embeddedVariants.length > 0) {
      throw new HttpErrors.BadRequest('Please select a product size and color');
    }

    const available = product.trackInventory === false
      ? MAX_CART_ITEM_QUANTITY
      : Math.max(0, Number(product.stockQuantity) || 0);

    return {variant: null, available: product.inStock === false ? 0 : available};
  }

  private assertStockAvailable(available: number, requestedQuantity: number): void {
    if (available < 1) {
      throw new HttpErrors.BadRequest('Selected product variant is out of stock');
    }

    if (requestedQuantity > available) {
      throw new HttpErrors.BadRequest(`Only ${available} item(s) available in stock`);
    }
  }

  @get('/api/cart/{userId}')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async getUserCart(
    @param.path.string('userId') userId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{success: boolean; cart: any}> {
    try {
      if (currentUser.id !== userId) {
        throw new HttpErrors.Forbidden('You can only access your own cart');
      }

      let cart = await this.cartsRepository.findOne({
        where: {userId, isActive: true},
      });

      if (!cart) {
        cart = await this.cartsRepository.create({
          id: uuidv4(),
          userId,
          isActive: true,
        });
      }

      const cartItems = await this.cartItemsRepository.find({
        where: {cartId: cart.id},
      });

      let subtotal = 0;
      const items = await Promise.all(cartItems.map(async (item: any) => {
        const product = await this.productsRepository.findById(item.productId);
        if (!product || product.isDeleted) {
          throw new HttpErrors.NotFound('Product not found');
        }
        let variant = null;
        if (item.variantId) {
          variant = await this.productsRepository.getVariant(item.productId, item.variantId);
          if (!variant) {
            const variants = product.variants || [];
            variant = variants.find((v: any) => v.id === item.variantId);
          }
        }
        const available = variant
          ? (variant.inStock === false ? 0 : Math.max(0, Number(variant.stockQuantity) || 0))
          : (product.inStock === false ? 0 : Math.max(0, Number(product.stockQuantity) || 0));
        const price = product?.salePrice || variant?.price || product?.price || 0;
        const itemTotal = price * item.quantity;
        subtotal += itemTotal;

        console.log('Item:', item);

        return {
          id: item.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          product: {
            id: product?.id,
            name: product?.name,
            slug: product?.slug,
            price: product?.price,
            salePrice: product?.salePrice,
            coverImage: product?.coverImage,
            images: variant?.images ? variant?.images : product?.images,
            available,
          },
          variant: variant ? variant : null,
          price,
          total: itemTotal,
        };
      }))

      return {
        success: true,
        cart: {
          id: cart.id,
          items,
          subtotal,
          itemCount: items.length,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  @post('/api/cart/{userId}/items')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async addToCart(
    @param.path.string('userId') userId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['productId', 'quantity'],
            properties: {
              productId: {type: 'string'},
              variantId: {type: 'string'},
              quantity: {type: 'number'},
            },
          },
        },
      },
    })
    request: AddToCartRequest,
  ): Promise<{success: boolean; message: string; cartItem: any}> {
    try {
      if (currentUser.id !== userId) {
        throw new HttpErrors.Forbidden('You can only modify your own cart');
      }

      const {productId, variantId, quantity} = request;

      if (quantity < 1) {
        throw new HttpErrors.BadRequest('Quantity must be at least 1');
      }

      if (quantity > MAX_CART_ITEM_QUANTITY) {
        throw new HttpErrors.BadRequest(
          `You can add a maximum of ${MAX_CART_ITEM_QUANTITY} quantity for a single variant.`,
        );
      }

      const product = await this.productsRepository.findById(productId);
      if (!product || product.isDeleted) {
        throw new HttpErrors.NotFound('Product not found');
      }

      let cart = await this.cartsRepository.findOne({
        where: {userId, isActive: true},
      });

      if (!cart) {
        cart = await this.cartsRepository.create({
          id: uuidv4(),
          userId,
          isActive: true,
        });
      }

      const existingItem = await this.cartItemsRepository.findOne({
        where: {
          cartId: cart.id,
          productId,
          variantId: variantId || undefined,
        },
      });

      const {available} = await this.getPurchasableStock(product, productId, variantId);
      const requestedTotal = (existingItem?.quantity ?? 0) + quantity;
      this.assertStockAvailable(available, requestedTotal);

      let cartItem;
      if (existingItem) {
        const nextQuantity = requestedTotal;

        if (nextQuantity > MAX_CART_ITEM_QUANTITY) {
          throw new HttpErrors.BadRequest(
            `You can add a maximum of ${MAX_CART_ITEM_QUANTITY} quantity for a single variant.`,
          );
        }

        await this.cartItemsRepository.updateById(existingItem.id, {
          quantity: nextQuantity,
        });
        cartItem = await this.cartItemsRepository.findById(existingItem.id);
      } else {
        cartItem = await this.cartItemsRepository.create({
          id: uuidv4(),
          cartId: cart.id,
          productId,
          variantId: variantId || undefined,
          quantity,
        });
      }

      return {
        success: true,
        message: 'Item added to cart',
        cartItem,
      };
    } catch (error) {
      throw error;
    }
  }

  @patch('/api/cart/{userId}/items/{itemId}')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async updateCartItem(
    @param.path.string('userId') userId: string,
    @param.path.string('itemId') itemId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['quantity'],
            properties: {
              quantity: {type: 'number'},
            },
          },
        },
      },
    })
    request: UpdateCartItemRequest,
  ): Promise<{success: boolean; message: string}> {
    try {
      if (currentUser.id !== userId) {
        throw new HttpErrors.Forbidden('You can only modify your own cart');
      }

      const {quantity} = request;

      if (quantity < 1) {
        throw new HttpErrors.BadRequest('Quantity must be at least 1');
      }

      if (quantity > MAX_CART_ITEM_QUANTITY) {
        throw new HttpErrors.BadRequest(
          `You can add a maximum of ${MAX_CART_ITEM_QUANTITY} quantity for a single variant.`,
        );
      }

      const cartItem = await this.cartItemsRepository.findById(itemId);
      const cart = await this.cartsRepository.findById(cartItem.cartId);

      if (cart.userId !== userId) {
        throw new HttpErrors.Forbidden('You can only modify your own cart');
      }

      const product = await this.productsRepository.findById(cartItem.productId);
      if (!product || product.isDeleted) {
        throw new HttpErrors.NotFound('Product not found');
      }

      const {available} = await this.getPurchasableStock(
        product,
        cartItem.productId,
        cartItem.variantId,
      );
      this.assertStockAvailable(available, quantity);

      await this.cartItemsRepository.updateById(itemId, {quantity});

      return {
        success: true,
        message: 'Cart item updated',
      };
    } catch (error) {
      throw error;
    }
  }

  @del('/api/cart/{userId}/items/{itemId}')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async removeFromCart(
    @param.path.string('userId') userId: string,
    @param.path.string('itemId') itemId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{success: boolean; message: string}> {
    try {
      if (currentUser.id !== userId) {
        throw new HttpErrors.Forbidden('You can only modify your own cart');
      }

      const cartItem = await this.cartItemsRepository.findById(itemId);
      const cart = await this.cartsRepository.findById(cartItem.cartId);

      if (cart.userId !== userId) {
        throw new HttpErrors.Forbidden('You can only modify your own cart');
      }

      await this.cartItemsRepository.deleteById(itemId);

      return {
        success: true,
        message: 'Item removed from cart',
      };
    } catch (error) {
      throw error;
    }
  }

  @del('/api/cart/{userId}')
  @authenticate('jwt')
  @authorize({roles: ['user']})
  async clearCart(
    @param.path.string('userId') userId: string,
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<{success: boolean; message: string}> {
    try {
      if (currentUser.id !== userId) {
        throw new HttpErrors.Forbidden('You can only modify your own cart');
      }

      const cart = await this.cartsRepository.findOne({
        where: {userId, isActive: true},
      });

      if (!cart) {
        return {
          success: true,
          message: 'Cart is already empty',
        };
      }

      await this.cartItemsRepository.deleteAll({cartId: cart.id});

      return {
        success: true,
        message: 'Cart cleared',
      };
    } catch (error) {
      throw error;
    }
  }
}
