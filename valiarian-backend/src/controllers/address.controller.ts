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

export class AddressController {
  constructor(
    @repository(AddressRepository)
    public addressRepository: AddressRepository,
  ) { }

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
            required: ['address', 'city', 'state', 'zipCode'],
            properties: {
              fullName: {type: 'string'},
              phone: {type: 'string'},
              email: {type: 'string'},
              address: {type: 'string'},
              city: {type: 'string'},
              state: {type: 'string'},
              zipCode: {type: 'string'},
              country: {type: 'string'},
              isPrimary: {type: 'boolean'},
            },
          },
        },
      },
    })
    address: Partial<Address>,
  ): Promise<Address> {
    console.log('CONTROLLER DATA:', address);
    if (address.zipCode) {
      address.zipCode = Number(address.zipCode);
    }
    if (address.isPrimary) {
      await this.addressRepository.updateAll(
        {isPrimary: false},
        {userId: currentUser.id},
      );
    }

    return this.addressRepository.create({
      ...address,
      userId: currentUser.id,
    });
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
    console.log('CONTROLLER DATA:', address);
    const existingAddress = await this.addressRepository.findById(id);
    if (existingAddress.userId !== currentUser.id) {
      throw new HttpErrors.Forbidden('Access denied');
    }

    if (address.zipCode) {
      address.zipCode = Number(address.zipCode);
    }

    if (address.isPrimary) {
      await this.addressRepository.updateAll(
        {isPrimary: false},
        {userId: currentUser.id},
      );
    }

    await this.addressRepository.updateById(id, address);
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
  }
}
