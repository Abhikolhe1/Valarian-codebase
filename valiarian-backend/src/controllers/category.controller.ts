import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getModelSchemaRef,
  patch,
  del,
  requestBody,
  response,
  HttpErrors,
} from '@loopback/rest';
import {Category, ParentCategory} from '../models';
import {CategoryRepository, ParentCategoryRepository} from '../repositories';
import {authenticate} from '@loopback/authentication';
import {authorize} from '../authorization';
import {isValidUuid, sanitizeUuid} from '../utils/validation.utils';

type CategoryTreeNode = {
  id: string;
  name: string;
  slug: string;
  type: 'parentCategory' | 'category';
  description?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  children: CategoryTreeNode[];
};

export class CategoryController {
  constructor(
    @repository(CategoryRepository)
    public categoryRepository: CategoryRepository,
    @repository(ParentCategoryRepository)
    public parentCategoryRepository: ParentCategoryRepository,
  ) {}

  private normalizeCategoryPayload(category: Partial<Category>): Partial<Category> {
    const hasParentCategoryId = Object.prototype.hasOwnProperty.call(
      category,
      'parentCategoryId',
    );
    const hasParentId = Object.prototype.hasOwnProperty.call(category, 'parentId');

    if (!hasParentCategoryId && !hasParentId) {
      return category;
    }

    const rawParentId = hasParentCategoryId
      ? category.parentCategoryId
      : category.parentId;

    const normalizedCategory: Partial<Category> = {
      ...category,
      parentCategoryId: sanitizeUuid(rawParentId),
    };

    delete normalizedCategory.parentId;
    return normalizedCategory;
  }

  private async ensureParentCategoryExists(parentId: string): Promise<void> {
    try {
      await this.parentCategoryRepository.findById(parentId);
    } catch {
      throw new HttpErrors.UnprocessableEntity('Selected parent category does not exist.');
    }
  }

  private async validateCategoryParent(category: Partial<Category>, categoryId?: string): Promise<void> {
    const {parentCategoryId} = category;
    
    if (parentCategoryId === undefined || parentCategoryId === null) {
      return;
    }

    if (!isValidUuid(parentCategoryId)) {
      throw new HttpErrors.BadRequest(
        `Invalid parent category ID format: ${parentCategoryId}. Expected UUID.`,
      );
    }

    if (parentCategoryId === categoryId) {
      throw new HttpErrors.BadRequest('A category cannot reference its own id as parent category.');
    }

    await this.ensureParentCategoryExists(parentCategoryId);
  }

  private async findParentCategoryByIdOrThrow(
    id: string,
    filter?: FilterExcludingWhere<ParentCategory>,
  ): Promise<ParentCategory> {
    try {
      return await this.parentCategoryRepository.findById(id, filter);
    } catch {
      throw new HttpErrors.NotFound(`Parent category with id ${id} was not found.`);
    }
  }

  private async assertCategoryCanBeDeleted(categoryId: string): Promise<void> {
    const [categoryProducts] = await Promise.all([
      this.categoryRepository.products(categoryId).find({limit: 1}),
    ]);

    if (categoryProducts.length > 0) {
      throw new HttpErrors.Conflict('Cannot delete a category that is assigned to products.');
    }
  }

  private async assertParentCategoryCanBeDeleted(parentCategoryId: string): Promise<void> {
    const childCategories = await this.parentCategoryRepository
      .categories(parentCategoryId)
      .find({limit: 1, where: {isDeleted: false}});

    if (childCategories.length > 0) {
      throw new HttpErrors.Conflict(
        'Cannot delete a parent category that still has categories.',
      );
    }
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin']})
  @post('/api/categories')
  @response(200, {
    description: 'Category model instance',
    content: {'application/json': {schema: getModelSchemaRef(Category)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Category, {
            title: 'NewCategory',
            exclude: ['id'],
          }),
        },
      },
    })
    category: Omit<Category, 'id'>,
  ): Promise<Category> {
    console.log('REQUEST BODY:', category);
    const normalizedCategory = this.normalizeCategoryPayload(category);
    await this.validateCategoryParent(normalizedCategory);
    return this.categoryRepository.create(normalizedCategory);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin']})
  @post('/api/parent-categories')
  @response(200, {
    description: 'Parent Category model instance',
    content: {'application/json': {schema: getModelSchemaRef(ParentCategory)}},
  })
  async createParentCategory(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(ParentCategory, {
            title: 'NewParentCategory',
            exclude: ['id'],
          }),
        },
      },
    })
    category: Omit<ParentCategory, 'id'>,
  ): Promise<ParentCategory> {
    console.log('REQUEST BODY:', category);
    return this.parentCategoryRepository.create(category);
  }

  @get('/api/categories/count')
  @response(200, {
    description: 'Category model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(Category) where?: Where<Category>,
  ): Promise<Count> {
    return this.categoryRepository.count(where);
  }

  @get('/api/categories')
  @response(200, {
    description: 'Array of Category model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Category, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(Category) filter?: Filter<Category>,
  ): Promise<Category[]> {
    return this.categoryRepository.find(filter);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin']})
  @get('/api/parent-categories')
  @response(200, {
    description: 'Array of parent category model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(ParentCategory, {includeRelations: true}),
        },
      },
    },
  })
  async findParentCategories(
    @param.filter(ParentCategory) filter?: Filter<ParentCategory>,
  ): Promise<ParentCategory[]> {
    return this.parentCategoryRepository.find(filter);
  }

  @get('/api/categories/tree')
  @response(200, {
    description: 'Hierarchical tree of categories',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {type: 'string'},
              name: {type: 'string'},
              slug: {type: 'string'},
              children: {type: 'array', items: {type: 'object'}}
            }
          }
        },
      },
    },
  })
  async findTree(): Promise<CategoryTreeNode[]> {
    const [parentCategories, categories] = await Promise.all([
      this.parentCategoryRepository.find({
        where: {isActive: true, isDeleted: false},
      }),
      this.categoryRepository.find({
        where: {isActive: true, isDeleted: false},
      }),
    ]);

    return parentCategories.map(parentCategory => ({
      id: parentCategory.id,
      name: parentCategory.name,
      slug: parentCategory.slug,
      type: 'parentCategory',
      description: parentCategory.description,
      isActive: parentCategory.isActive ?? true,
      createdAt: parentCategory.createdAt,
      updatedAt: parentCategory.updatedAt,
      children: categories
        .filter(category => category.parentCategoryId === parentCategory.id)
        .map(category => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          type: 'category',
          description: category.description,
          isActive: category.isActive ?? true,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
          children: [],
        })),
    }));
  }

  @get('/api/categories/{id}')
  @response(200, {
    description: 'Category model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Category, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(Category, {exclude: 'where'}) filter?: FilterExcludingWhere<Category>
  ): Promise<Category> {
    return this.categoryRepository.findById(id, filter);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin']})
  @get('/api/parent-categories/{id}')
  @response(200, {
    description: 'Parent category model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(ParentCategory, {includeRelations: true}),
      },
    },
  })
  async findParentCategoryById(
    @param.path.string('id') id: string,
    @param.filter(ParentCategory, {exclude: 'where'})
    filter?: FilterExcludingWhere<ParentCategory>
  ): Promise<ParentCategory> {
    return this.findParentCategoryByIdOrThrow(id, filter);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin']})
  @patch('/api/categories/{id}')
  @response(204, {
    description: 'Category PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Category, {partial: true}),
        },
      },
    })
    category: Category,
  ): Promise<void> {
    console.log('REQUEST BODY:', category);
    const normalizedCategory = this.normalizeCategoryPayload(category);
    await this.validateCategoryParent(normalizedCategory, id);
    await this.categoryRepository.updateById(id, normalizedCategory);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin']})
  @patch('/api/parent-categories/{id}')
  @response(204, {
    description: 'Parent category PATCH success',
  })
  async updateParentCategoryById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(ParentCategory, {
            partial: true,
          }),
        },
      },
    })
    category: Partial<ParentCategory>,
  ): Promise<void> {
    await this.findParentCategoryByIdOrThrow(id);
    console.log('REQUEST BODY:', category);
    await this.parentCategoryRepository.updateById(id, category);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin']})
  @del('/api/categories/{id}')
  @response(204, {
    description: 'Category DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.categoryRepository.findById(id);
    await this.assertCategoryCanBeDeleted(id);
    await this.categoryRepository.deleteById(id);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin']})
  @del('/api/parent-categories/{id}')
  @response(204, {
    description: 'Parent category DELETE success',
  })
  async deleteParentCategoryById(@param.path.string('id') id: string): Promise<void> {
    await this.findParentCategoryByIdOrThrow(id);
    await this.assertParentCategoryCanBeDeleted(id);
    await this.parentCategoryRepository.deleteById(id);
  }
}
