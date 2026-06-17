import {Constructor} from '@loopback/core';
import {
  Count,
  DataObject,
  Entity,
  EntityCrudRepository,
  Options,
  Where,
} from '@loopback/repository';
import {v4 as uuidv4} from 'uuid';
import {sanitizeUuid} from '../utils/validation.utils';

export function TimeStampRepositoryMixin<
  E extends Entity & {id?: string; createdAt?: Date; updatedAt?: Date},
  ID,
  R extends Constructor<EntityCrudRepository<E, ID>>,
>(repository: R) {
  class MixedRepository extends repository {

    async create(entity: DataObject<E>, options?: Options): Promise<E> {
      // Auto-set UUID
      if (!entity.id) {
        entity.id = uuidv4();
      } else {
        entity.id = sanitizeUuid(entity.id) as any;
      }

      console.log('REPO DATA:', entity);

      entity.createdAt = new Date();
      entity.updatedAt = new Date();
      return super.create(entity, options);
    }

    async createAll(
      entities: DataObject<E>[],
      options?: Options,
    ): Promise<E[]> {
      const currentTime = new Date();

      entities.forEach(entity => {
        if (!entity.id) {
          entity.id = uuidv4();
        } else {
          entity.id = sanitizeUuid(entity.id) as any;
        }
        entity.createdAt = currentTime;
        entity.updatedAt = currentTime;
      });

      console.log('REPO DATA:', entities);

      return super.createAll(entities, options);
    }

    async updateAll(
      data: DataObject<E>,
      where?: Where<E>,
      options?: Options,
    ): Promise<Count> {
      if (data.id) {
        data.id = sanitizeUuid(data.id) as any;
      }
      data.updatedAt = new Date();
      console.log('REPO DATA:', data);
      return super.updateAll(data, where, options);
    }

    async replaceById(
      id: ID,
      data: DataObject<E>,
      options?: Options,
    ): Promise<void> {
      if (data.id) {
        data.id = sanitizeUuid(data.id) as any;
      }
      data.updatedAt = new Date();
      console.log('REPO DATA:', data);
      return super.replaceById(id, data, options);
    }

    async updateById(
      id: ID,
      data: DataObject<E>,
      options?: Options,
    ): Promise<void> {
      if (data.id) {
        data.id = sanitizeUuid(data.id) as any;
      }
      data.updatedAt = new Date();
      console.log('REPO DATA:', data);
      return super.updateById(id, data, options);
    }
  }

  return MixedRepository;
}
