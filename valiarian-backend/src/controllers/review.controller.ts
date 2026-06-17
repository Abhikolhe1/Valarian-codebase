import {authenticate, AuthenticationBindings} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  del,
  get,
  HttpErrors,
  param,
  patch,
  post,
  put,
  Request,
  requestBody,
  response,
  RestBindings,
} from '@loopback/rest';
import {securityId, UserProfile} from '@loopback/security';
import {authorize} from '../authorization';
import {Order, Product, Review, Users} from '../models';
import {
  OrderItemRepository,
  OrderRepository,
  ProductRepository,
  ReviewRepository,
  UsersRepository,
} from '../repositories';
import {JWTService} from '../services/jwt-service';

type ReviewPayload = {
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
};

export class ReviewController {
  constructor(
    @repository(ReviewRepository)
    public reviewRepository: ReviewRepository,
    @repository(ProductRepository)
    public productRepository: ProductRepository,
    @repository(UsersRepository)
    public usersRepository: UsersRepository,
    @repository(OrderRepository)
    public orderRepository: OrderRepository,
    @repository(OrderItemRepository)
    public orderItemRepository: OrderItemRepository,
    @inject('service.jwt.service')
    public jwtService: JWTService,
  ) {}

  private getCurrentUserId(currentUser: UserProfile): string {
    return String(currentUser.id || currentUser[securityId]);
  }

  private async parseOptionalUser(request: Request): Promise<UserProfile | undefined> {
    try {
      const authHeader = request.headers.authorization;

      if (!authHeader?.startsWith('Bearer ')) {
        return undefined;
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        return undefined;
      }

      return this.jwtService.verifyToken(token);
    } catch (error) {
      return undefined;
    }
  }

  private async ensureProductExists(productId: string): Promise<Product> {
    const product = await this.productRepository.findById(productId);

    if (!product || product.isDeleted) {
      throw new HttpErrors.NotFound(`Product with id "${productId}" not found`);
    }

    return product;
  }

  private async ensureReviewExists(reviewId: string): Promise<Review> {
    const review = await this.reviewRepository.findById(reviewId);

    if (!review || review.isDeleted) {
      throw new HttpErrors.NotFound('Review not found');
    }

    return review;
  }

  private async hasPurchasedProduct(userId: string, productId: string): Promise<boolean> {
    const orderItems = await this.orderItemRepository.find({
      where: {productId},
      fields: {orderId: true},
    });

    if (!orderItems.length) {
      return false;
    }

    const orderIds = Array.from(new Set(orderItems.map((item) => item.orderId).filter(Boolean)));

    if (!orderIds.length) {
      return false;
    }

    const orders = await this.orderRepository.find({
      where: {
        id: {inq: orderIds},
        userId,
        isDeleted: false,
        status: {
          nin: ['failed', 'cancelled'],
        } as never,
      } as never,
      fields: {
        id: true,
      },
    });

    return orders.length > 0;
  }

  private sanitizeImages(images?: string[]): string[] {
    if (!Array.isArray(images)) {
      return [];
    }

    return images.filter((image) => typeof image === 'string' && image.trim().length > 0);
  }

  private async buildReviewViewModels(
    reviews: Review[],
    currentUserId?: string,
  ): Promise<any[]> {
    const userIds = Array.from(new Set(reviews.map((review) => review.userId).filter(Boolean)));
    const users = userIds.length
      ? await this.usersRepository.find({
          where: {id: {inq: userIds}},
          fields: {id: true, fullName: true, email: true, profilePicture: true},
        })
      : [];

    const usersMap = new Map<string, Users>(users.map((user) => [user.id, user]));

    return reviews.map((review) => {
      const user = usersMap.get(review.userId);
      const isOwner = currentUserId === review.userId;

      return {
        id: review.id,
        productId: review.productId,
        userId: review.userId,
        rating: review.rating,
        title: review.title || '',
        comment: review.comment,
        images: review.images || [],
        isHidden: review.isHidden,
        hiddenReason: review.hiddenReason || '',
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        userName: user?.fullName || user?.email || 'User',
        userAvatar: user?.profilePicture || '',
        isOwner,
      };
    });
  }

  private buildReviewStats(reviews: Review[]) {
    const breakdown = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: reviews.filter((review) => review.rating === star).length,
    }));

    const totalReviews = reviews.length;
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalReviews ? Number((totalRating / totalReviews).toFixed(1)) : 0;

    return {
      averageRating,
      totalReviews,
      breakdown,
    };
  }

  @authenticate('jwt')
  @post('/api/reviews')
  @response(201, {
    description: 'Create product review',
  })
  async createReview(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['productId', 'rating', 'comment'],
            properties: {
              productId: {type: 'string', format: 'uuid'},
              rating: {type: 'number', minimum: 1, maximum: 5},
              title: {type: 'string'},
              comment: {type: 'string', minLength: 1},
              images: {type: 'array', items: {type: 'string'}},
            },
          },
        },
      },
    })
    body: ReviewPayload & {productId: string},
  ) {
    const userId = this.getCurrentUserId(currentUser);

    await this.ensureProductExists(body.productId);

    const hasPurchased = await this.hasPurchasedProduct(userId, body.productId);
    if (!hasPurchased) {
      throw new HttpErrors.Forbidden('You are not eligible to review this product');
    }

    const existingReview = await this.reviewRepository.findOne({
      where: {
        userId,
        productId: body.productId,
        isDeleted: false,
      },
    });

    if (existingReview) {
      throw new HttpErrors.Conflict('You have already reviewed this product');
    }

    const review = await this.reviewRepository.create({
      userId,
      productId: body.productId,
      rating: body.rating,
      title: body.title?.trim() || '',
      comment: body.comment.trim(),
      images: this.sanitizeImages(body.images),
      isHidden: false,
      isActive: true,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const [reviewView] = await this.buildReviewViewModels([review], userId);

    return {
      message: 'Review submitted successfully',
      review: reviewView,
    };
  }

  @authenticate('jwt')
  @put('/api/reviews/{id}')
  async updateReview(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              rating: {type: 'number', minimum: 1, maximum: 5},
              title: {type: 'string'},
              comment: {type: 'string', minLength: 1},
              images: {type: 'array', items: {type: 'string'}},
            },
          },
        },
      },
    })
    body: Partial<ReviewPayload>,
  ) {
    const userId = this.getCurrentUserId(currentUser);
    const review = await this.ensureReviewExists(id);

    if (review.userId !== userId) {
      throw new HttpErrors.Forbidden('You can only edit your own review');
    }

    await this.reviewRepository.updateById(id, {
      ...(body.rating !== undefined ? {rating: body.rating} : {}),
      ...(body.title !== undefined ? {title: body.title.trim()} : {}),
      ...(body.comment !== undefined ? {comment: body.comment.trim()} : {}),
      ...(body.images !== undefined ? {images: this.sanitizeImages(body.images)} : {}),
      updatedAt: new Date(),
    });

    const updatedReview = await this.reviewRepository.findById(id);
    const [reviewView] = await this.buildReviewViewModels([updatedReview], userId);

    return {
      message: 'Review updated successfully',
      review: reviewView,
    };
  }

  @authenticate('jwt')
  @del('/api/reviews/{id}')
  async deleteReview(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @param.path.string('id') id: string,
  ) {
    const review = await this.ensureReviewExists(id);
    const userId = this.getCurrentUserId(currentUser);
    const roles = Array.isArray(currentUser.roles) ? currentUser.roles : [];
    const isAdmin = roles.includes('admin') || roles.includes('super_admin');

    if (review.userId !== userId && !isAdmin) {
      throw new HttpErrors.Forbidden('You can only delete your own review');
    }

    await this.reviewRepository.updateById(id, {
      isDeleted: true,
      isActive: false,
      updatedAt: new Date(),
    });

    return {
      message: 'Review deleted successfully',
    };
  }

  @get('/api/reviews/product/{productId}')
  async getProductReviews(
    @param.path.string('productId') productId: string,
    @inject(RestBindings.Http.REQUEST) request: Request,
  ) {
    await this.ensureProductExists(productId);

    const currentUser = await this.parseOptionalUser(request);
    const currentUserId = currentUser?.id ? String(currentUser.id) : undefined;

    const where = currentUserId
      ? ({
          productId,
          isDeleted: false,
          or: [{isHidden: false}, {userId: currentUserId}],
        } as never)
      : ({productId, isDeleted: false, isHidden: false} as never);

    const reviews = await this.reviewRepository.find({
      where,
      order: ['createdAt DESC'],
    });

    const reviewViews = await this.buildReviewViewModels(reviews, currentUserId);
    const stats = this.buildReviewStats(reviews.filter((review) => !review.isHidden || review.userId === currentUserId));

    let canWriteReview = false;
    let canEditReview = false;
    let myReviewId: string | null = null;

    if (currentUserId) {
      const myReview = await this.reviewRepository.findOne({
        where: {
          productId,
          userId: currentUserId,
          isDeleted: false,
        },
      });

      myReviewId = myReview?.id || null;
      canEditReview = !!myReview;
      canWriteReview = !myReview && (await this.hasPurchasedProduct(currentUserId, productId));
    }

    return {
      reviews: reviewViews,
      stats,
      eligibility: {
        canWriteReview,
        canEditReview,
        myReviewId,
      },
    };
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  @patch('/api/admin/reviews/{id}/hide')
  async toggleReviewHidden(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              isHidden: {type: 'boolean'},
              hiddenReason: {type: 'string'},
            },
          },
        },
      },
    })
    body: {isHidden?: boolean; hiddenReason?: string},
  ) {
    const review = await this.ensureReviewExists(id);
    const isHidden = body.isHidden ?? !review.isHidden;
    const hiddenReason = body.hiddenReason?.trim();

    if (isHidden && !hiddenReason) {
      throw new HttpErrors.UnprocessableEntity('Reason is required when hiding a review');
    }

    await this.reviewRepository.updateById(id, {
      isHidden,
      hiddenReason: isHidden ? hiddenReason : '',
      updatedAt: new Date(),
    });

    return {
      message: `Review ${isHidden ? 'hidden' : 'unhidden'} successfully`,
      review: await this.reviewRepository.findById(id),
    };
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  @get('/api/admin/products/{productId}/reviews')
  async getAdminProductReviews(@param.path.string('productId') productId: string) {
    await this.ensureProductExists(productId);

    const reviews = await this.reviewRepository.find({
      where: {
        productId,
        isDeleted: false,
      },
      order: ['createdAt DESC'],
    });

    const reviewViews = await this.buildReviewViewModels(reviews);

    return {
      reviews: reviewViews,
      stats: this.buildReviewStats(reviews),
    };
  }
}
