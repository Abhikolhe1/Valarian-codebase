import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository, Count, CountSchema, Filter, Where} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  requestBody,
  response,
} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {authorize} from '../authorization';
import {Address} from '../models';
import {AddressRepository} from '../repositories';
import {CacheService} from '../services/cache.service';

const CHECKOUT_SUMMARY_CACHE_PREFIX = 'checkout:summary:';

export class AddressController {
  constructor(
    @repository(AddressRepository)
    public addressRepository: AddressRepository,
    @inject('services.cache')
    public cacheService: CacheService,
  ) { }

  private async invalidateCheckoutSummary(userId: string): Promise<void> {
    await this.cacheService.delete(`${CHECKOUT_SUMMARY_CACHE_PREFIX}${userId}`);
  }

  @authenticate('jwt')
  @authorize({roles: ['user']})
  @post('/api/addresses')
  @response(200, {
    description: 'Address model instance',
    content: {'application/json': {schema: getModelSchemaRef(Address)}},
  })
  async create(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: [
              'fullName',
              'mobileNumber',
              'pincode',
              'state',
              'city',
              'addressLine1',
              'addressType',
            ],
            properties: {
              fullName: {type: 'string'},
              mobileNumber: {type: 'string'},
              pincode: {type: 'string'},
              state: {type: 'string'},
              city: {type: 'string'},
              addressLine1: {type: 'string'},
              addressLine2: {type: 'string'},
              landmark: {type: 'string'},
              addressType: {type: 'string', enum: ['home', 'work']},
              isPrimary: {type: 'boolean'},
            },
          },
        },
      },
    })
    address: Partial<Address>,
  ): Promise<Address> {
    const normalizedAddress = this.normalizeAddressPayload(address);

    if (normalizedAddress.isPrimary) {
      await this.addressRepository.updateAll(
        {isPrimary: false},
        {userId: currentUser.id},
      );
    }
    const createdAddress = await this.addressRepository.create({
      ...normalizedAddress,
      userId: currentUser.id,
    });
    await this.invalidateCheckoutSummary(currentUser.id);
    return createdAddress;
  }

  @authenticate('jwt')
  @get('/api/addresses/count')
  @response(200, {
    description: 'Address model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(Address) where?: Where<Address>,
  ): Promise<Count> {
    return this.addressRepository.count(where);
  }

  @authenticate('jwt')
  @get('/api/addresses')
  @response(200, {
    description: 'Array of Address model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Address, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @param.filter(Address) filter?: Filter<Address>,
  ): Promise<Address[]> {
    return this.addressRepository.find({
      ...filter,
      where: {
        ...filter?.where,
        userId: currentUser.id,
      },
    });
  }

  @authenticate('jwt')
  @get('/api/addresses/{id}')
  @response(200, {
    description: 'Address model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Address, {includeRelations: true}),
      },
    },
  })
  async findById(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @param.path.string('id') id: string,
  ): Promise<Address> {
    const address = await this.addressRepository.findById(id);

    if (address.userId !== currentUser.id) {
      throw new HttpErrors.Forbidden('Access denied');
    }

    return address;
  }

  @authenticate('jwt')
  @patch('/api/addresses/{id}')
  @response(204, {
    description: 'Address PATCH success',
  })
  async updateById(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Address, {partial: true}),
        },
      },
    })
    address: Address,
  ): Promise<void> {
    const existingAddress = await this.addressRepository.findById(id);
    if (existingAddress.userId !== currentUser.id) {
      throw new HttpErrors.Forbidden('Access denied');
    }

    const normalizedAddress = this.normalizeAddressPayload(address, true);

    if (normalizedAddress.isPrimary) {
      await this.addressRepository.updateAll(
        {isPrimary: false},
        {userId: currentUser.id},
      );
    }

    await this.addressRepository.updateById(id, normalizedAddress);
    await this.invalidateCheckoutSummary(currentUser.id);
  }

  @authenticate('jwt')
  @patch('/api/addresses/{id}/set-primary')
  @response(204, {
    description: 'Address set as primary success',
  })
  async setPrimary(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @param.path.string('id') id: string,
  ): Promise<void> {
    const existingAddress = await this.addressRepository.findById(id);

    if (existingAddress.userId !== currentUser.id) {
      throw new HttpErrors.Forbidden('Access denied');
    }

    await this.addressRepository.updateAll(
      {isPrimary: false},
      {userId: currentUser.id},
    );

    await this.addressRepository.updateById(id, {isPrimary: true});
    await this.invalidateCheckoutSummary(currentUser.id);
  }

  @authenticate('jwt')
  @del('/api/addresses/{id}')
  @response(204, {
    description: 'Address DELETE success',
  })
  async deleteById(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @param.path.string('id') id: string,
  ): Promise<void> {
    const existingAddress = await this.addressRepository.findById(id);
    if (existingAddress.userId !== currentUser.id) {
      throw new HttpErrors.Forbidden('Access denied');
    }
    await this.addressRepository.deleteById(id);
    await this.invalidateCheckoutSummary(currentUser.id);
  }

  private normalizeAddressPayload(address: Partial<Address>, partial = false): Partial<Address> {
    const normalizedAddress: Partial<Address> = {
      ...address,
      fullName: address.fullName?.trim(),
      mobileNumber: address.mobileNumber?.trim(),
      pincode: address.pincode?.trim(),
      state: address.state?.trim(),
      city: address.city?.trim(),
      addressLine1: address.addressLine1?.trim(),
      addressLine2: address.addressLine2?.trim() || undefined,
      landmark: address.landmark?.trim() || undefined,
      addressType:
        typeof address.addressType === 'undefined'
          ? undefined
          : address.addressType === 'work'
            ? 'work'
            : 'home',
    };

    const requiredFields = [
      'fullName',
      'mobileNumber',
      'pincode',
      'state',
      'city',
      'addressLine1',
      'addressType',
    ] as const;

    if (!partial) {
      for (const field of requiredFields) {
        if (!normalizedAddress[field]) {
          throw new HttpErrors.BadRequest(`${field} is required`);
        }
      }
    }

    if (normalizedAddress.mobileNumber && !/^[0-9]{10}$/.test(normalizedAddress.mobileNumber)) {
      throw new HttpErrors.BadRequest('mobileNumber must be 10 digits');
    }

    if (normalizedAddress.pincode && !/^[0-9]{6}$/.test(normalizedAddress.pincode)) {
      throw new HttpErrors.BadRequest('pincode must be 6 digits');
    }

    return normalizedAddress;
  }
}
