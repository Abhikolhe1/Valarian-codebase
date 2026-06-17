import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {del, get, HttpErrors, param, post, requestBody} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {authorize} from '../authorization';
import {ProductRepository, UsersRepository} from '../repositories';

export class FavoritesController {
  constructor(
    @repository(UsersRepository)
    public usersRepository: UsersRepository,
    @repository(ProductRepository)
    public productRepository: ProductRepository,
  ) {}

  private async buildFavoritesResponse(userId: string) {
    const user = await this.usersRepository.findById(userId, {
      fields: {
        id: true,
        favoriteProductIds: true,
      },
    });

    const favoriteProductIds = Array.isArray(user.favoriteProductIds) ? user.favoriteProductIds : [];

    if (!favoriteProductIds.length) {
      return {
        success: true,
        favorites: [],
      };
    }

    const products = await this.productRepository.find({
      where: {
        and: [
          {id: {inq: favoriteProductIds}},
          {isDeleted: false},
          {isActive: true},
          {status: 'published'},
        ],
      },
      fields: {
        id: true,
        name: true,
        slug: true,
        price: true,
        salePrice: true,
        coverImage: true,
        images: true,
        colors: true,
        sizes: true,
        variants: true,
        stockQuantity: true,
        inStock: true,
      },
    });

    const productsById = new Map(products.map(product => [product.id, product]));

    return {
      success: true,
      favorites: favoriteProductIds
        .map(productId => {
          const product = productsById.get(productId);

          if (!product) {
            return null;
          }

          return {
            productId,
            product,
          };
        })
        .filter(Boolean),
    };
  }

  @authenticate('jwt')
  @authorize({roles: ['user']})
  @get('/api/favorites/{userId}')
  async getFavorites(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @param.path.string('userId') userId: string,
  ) {
    if (currentUser.id !== userId) {
      throw new HttpErrors.Forbidden('You can only view your own favorites');
    }

    return this.buildFavoritesResponse(userId);
  }

  @authenticate('jwt')
  @authorize({roles: ['user']})
  @post('/api/favorites')
  async addFavorite(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['productId'],
            properties: {
              productId: {type: 'string'},
            },
          },
        },
      },
    })
    body: {productId: string},
  ) {
    const product = await this.productRepository.findOne({
      where: {
        and: [
          {id: body.productId},
          {isDeleted: false},
          {isActive: true},
          {status: 'published'},
        ],
      },
    });

    if (!product) {
      throw new HttpErrors.NotFound('Product not found');
    }

    const user = await this.usersRepository.findById(currentUser.id, {
      fields: {
        id: true,
        favoriteProductIds: true,
      },
    });

    const favoriteProductIds = Array.isArray(user.favoriteProductIds) ? user.favoriteProductIds : [];

    if (!favoriteProductIds.includes(body.productId)) {
      await this.usersRepository.updateById(currentUser.id, {
        favoriteProductIds: [...favoriteProductIds, body.productId],
      });
    }

    return {
      isFavorited: true,
      ...(await this.buildFavoritesResponse(currentUser.id)),
    };
  }

  @authenticate('jwt')
  @authorize({roles: ['user']})
  @del('/api/favorites/{productId}')
  async removeFavorite(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @param.path.string('productId') productId: string,
  ) {
    const user = await this.usersRepository.findById(currentUser.id, {
      fields: {
        id: true,
        favoriteProductIds: true,
      },
    });

    const favoriteProductIds = Array.isArray(user.favoriteProductIds) ? user.favoriteProductIds : [];

    await this.usersRepository.updateById(currentUser.id, {
      favoriteProductIds: favoriteProductIds.filter(id => id !== productId),
    });

    return {
      isFavorited: false,
      ...(await this.buildFavoritesResponse(currentUser.id)),
    };
  }
}
