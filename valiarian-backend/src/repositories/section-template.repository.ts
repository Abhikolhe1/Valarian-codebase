import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {SectionTemplate, SectionTemplateRelations} from '../models';

export class SectionTemplateRepository extends DefaultCrudRepository<
  SectionTemplate,
  typeof SectionTemplate.prototype.id,
  SectionTemplateRelations
> {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(SectionTemplate, dataSource);
  }

  /**
   * Find templates by type
   * @param type - Section type
   * @returns Array of templates
   */
  async findByType(
    type: SectionTemplate['type'],
  ): Promise<SectionTemplate[]> {
    return this.find({
      where: {type},
      order: ['name ASC'],
    });
  }

  /**
   * Find all templates grouped by type
   * @returns Templates grouped by type
   */
  async findGroupedByType(): Promise<{
    [key: string]: SectionTemplate[];
  }> {
    const templates = await this.find({
      order: ['type ASC', 'name ASC'],
    });

    const grouped: {[key: string]: SectionTemplate[]} = {};
    templates.forEach(template => {
      if (!grouped[template.type]) {
        grouped[template.type] = [];
      }
      grouped[template.type].push(template);
    });

    return grouped;
  }
}
