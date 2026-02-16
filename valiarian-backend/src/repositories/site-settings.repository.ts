import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {SiteSettings, SiteSettingsRelations} from '../models';

export class SiteSettingsRepository extends DefaultCrudRepository<
  SiteSettings,
  typeof SiteSettings.prototype.id,
  SiteSettingsRelations
> {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(SiteSettings, dataSource);
  }

  /**
   * Get the singleton site settings instance
   * @returns Site settings or null
   */
  async getSingleton(): Promise<SiteSettings | null> {
    const settings = await this.find({limit: 1});
    return settings.length > 0 ? settings[0] : null;
  }

  /**
   * Update the singleton site settings instance
   * @param data - Settings data to update
   * @returns Updated site settings
   */
  async updateSingleton(
    data: Partial<SiteSettings>,
  ): Promise<SiteSettings> {
    const existing = await this.getSingleton();
    if (!existing) {
      throw new Error('Site settings not found');
    }

    const now = new Date();
    await this.updateById(existing.id, {
      ...data,
      updatedAt: now,
    });

    return this.findById(existing.id);
  }
}
