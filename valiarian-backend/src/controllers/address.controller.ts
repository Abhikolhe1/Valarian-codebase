import {
  authenticate
} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {
  Count,
  CountSchema,
  FilterExcludingWhere,
  repository
} from '@loopback/repository';
import {
  del,
  get,
  HttpErrors,
  param,
  patch,
  post,
  requestBody,
  response,
} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {Address} from '../models';
import {AddressRepository} from '../repositories';

export class AddressController {
  constructor(
    @repository(AddressRepository)
    public addressRepository: AddressRepository,
  ) { }

  @authenticate('jwt')
  @post('/api/addresses')
  @response(200, {
    description: 'Address model instance',
  })
  async create(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['address', 'city', 'state', 'country', 'zipCode'],
            properties: {
              address: {type: 'string'},
              city: {type: 'string'},
              state: {type: 'string'},
              country: {type: 'string'},
              zipCode: {type: 'number'},
              isPrimary: {type: 'boolean'},
            },
          },
        },
      },
    })
    address: Partial<Address>,
  ): Promise<Address> {
    // If this address is marked as primary, unset all other primary addresses
    if (address.zipCode) {
      address.zipCode = Number(address.zipCode);
    }
    if (address.isPrimary) {
      await this.addressRepository.updateAll(
        {isPrimary: false},
        {userId: currentUser.id},
      );
    }

    console.log('efrsadfgsdgfRequest Body:', address, typeof address.zipCode);
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
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @param.query.object('where') where?: any,
  ): Promise<Count> {
    return this.addressRepository.count({
      ...where,
      userId: currentUser.id,
    });
  }

  @authenticate('jwt')
  @get('/api/addresses')
  @response(200, {
    description: 'Array of Address model instances',
  })
  async find(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<Address[]> {
    return this.addressRepository.find({
      where: {
        userId: currentUser.id,
      },
      include: [{relation: 'user'}],
    });
  }

  @authenticate('jwt')
  @get('/api/addresses/{id}')
  @response(200, {
    description: 'Address model instance',
  })
  async findById(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @param.path.string('id') id: string,
    @param.filter(Address, {exclude: 'where'})
    filter?: FilterExcludingWhere<Address>,
  ): Promise<Address> {
    const address = await this.addressRepository.findById(id, filter);

    // Verify the address belongs to the current user
    if ((address).userId !== currentUser.id) {
      throw new HttpErrors.Forbidden('You do not have access to this address');
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
          schema: {
            type: 'object',
            properties: {
              address: {type: 'string'},
              city: {type: 'string'},
              state: {type: 'string'},
              country: {type: 'string'},
              zipCode: {type: 'number'},
              isPrimary: {type: 'boolean'},
            },
          },
        },
      },
    })
    address: any,
  ): Promise<void> {
    // Verify the address belongs to the current user
    const existingAddress = await this.addressRepository.findById(id);
    if ((existingAddress).userId !== currentUser.id) {
      throw new HttpErrors.Forbidden('You do not have access to this address');
    }

    // If marking as primary, unset all other primary addresses
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
    // Verify the address belongs to the current user
    const address = await this.addressRepository.findById(id);
    if ((address).userId !== currentUser.id) {
      throw new HttpErrors.Forbidden('You do not have access to this address');
    }

    await this.addressRepository.deleteById(id);
  }

  @authenticate('jwt')
  @patch('/api/addresses/{id}/set-primary')
  @response(200, {
    description: 'Set address as primary',
  })
  async setPrimary(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @param.path.string('id') id: string,
  ): Promise<{success: boolean; message: string}> {
    // Verify the address belongs to the current user
    const address = await this.addressRepository.findById(id);
    if ((address).userId !== currentUser.id) {
      throw new HttpErrors.Forbidden('You do not have access to this address');
    }

    // Unset all other primary addresses for this user
    await this.addressRepository.updateAll(
      {isPrimary: false},
      {userId: currentUser.id},
    );

    // Set this address as primary
    await this.addressRepository.updateById(id, {isPrimary: true});

    return {
      success: true,
      message: 'Address set as primary',
    };
  }
}
