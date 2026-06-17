import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValiarianDataSource} from '../datasources';
import {SectionTemplate, SectionTemplateRelations} from '../models';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';

export class SectionTemplateRepository extends TimeStampRepositoryMixin<
  SectionTemplate,
  typeof SectionTemplate.prototype.id,
  Constructor<
    DefaultCrudRepository<
      SectionTemplate,
      typeof SectionTemplate.prototype.id,
      SectionTemplateRelations
    >
  >
>(DefaultCrudRepository) {
  constructor(
    @inject('datasources.valiarian') dataSource: ValiarianDataSource,
  ) {
    super(SectionTemplate, dataSource);
  }

  async findByType(
    type: SectionTemplate['type'],
  ): Promise<SectionTemplate[]> {
    return this.find({
      where: {type, isDeleted: false},
    });
  }

  async findGroupedByType(): Promise<{
    [key: string]: SectionTemplate[];
  }> {
    const templates = await this.find({
      where: {isDeleted: false},
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
