import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {SiteSettings, SiteSettingsRelations} from '../models';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';

export class SiteSettingsRepository extends TimeStampRepositoryMixin<
  SiteSettings,
  typeof SiteSettings.prototype.id,
  Constructor<
    DefaultCrudRepository<
      SiteSettings,
      typeof SiteSettings.prototype.id,
      SiteSettingsRelations
    >
  >
>(DefaultCrudRepository) {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(SiteSettings, dataSource);
  }

  async getSingleton(): Promise<SiteSettings | null> {
    const settings = await this.find({limit: 1});
    return settings.length > 0 ? settings[0] : null;
  }

  async updateSingleton(
    data: Partial<SiteSettings>,
  ): Promise<SiteSettings> {
    const existing = await this.getSingleton();
    if (!existing) {
      return this.create(data);
    }

    await this.updateById(existing.id, {
      ...data,
      updatedAt: new Date(),
    });

    return this.findById(existing.id);
  }
}
