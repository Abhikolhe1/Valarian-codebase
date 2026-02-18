import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {get, HttpErrors, param, patch, post, requestBody, response} from '@loopback/rest';
import {v4 as uuidv4} from 'uuid';
import {authorize} from '../authorization';
import {Page} from '../models';
import {PageRepository} from '../repositories';
import {CacheService} from '../services/cache.service';
import {CMSService} from '../services/cms.service';

export class CMSPageController {
  constructor(
    @repository(PageRepository) public pageRepository: PageRepository,
    @inject('services.cache') public cacheService: CacheService,
    @inject('services.cms') public cmsService: CMSService,
  ) { }

  @get('/api/cms/pages')
  @response(200, {description: 'Array of Page model instances'})
  async find(
    @param.query.string('status') status?: string,
    @param.query.string('search') search?: string,
  ): Promise<Page[]> {
    const where: any = {};
    if (status) where.status = status;
    if (search) where.or = [{title: {like: '%' + search + '%'}}, {slug: {like: '%' + search + '%'}}];
    return this.pageRepository.find({where, order: ['createdAt DESC']});
  }

  @get('/api/cms/pages/slug/{slug}')
  @response(200, {description: 'Page by slug'})
  async findBySlug(@param.path.string('slug') slug: string): Promise<Page> {
    const page = await this.pageRepository.findBySlug(slug, true); // Include sections
    if (!page) throw new HttpErrors.NotFound('Page not found');
    return page;
  }

  @authenticate('jwt')
  @get('/api/cms/pages/{id}')
  @response(200, {description: 'Page by ID'})
  async findById(@param.path.string('id') id: string): Promise<Page> {
    const page = await this.pageRepository.findById(id);
    if (!page) throw new HttpErrors.NotFound('Page not found');
    return page;
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @post('/api/cms/pages')
  @response(200, {description: 'Create page'})
  async create(
    @requestBody() page: Omit<Page, 'id' | 'createdAt' | 'updatedAt' | 'version'>,
  ): Promise<Page> {
    return this.pageRepository.create({...page, id: uuidv4(), version: 1});
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @patch('/api/cms/pages/{id}')
  @response(204, {description: 'Update page'})
  async updateById(
    @param.path.string('id') id: string,
    @requestBody() page: Partial<Page>,
  ): Promise<void> {
    const existing = await this.pageRepository.findById(id);
    if (!existing) throw new HttpErrors.NotFound('Page not found');
    await this.pageRepository.updateById(id, {...page, version: (existing.version || 1) + 1});
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  @post('/api/cms/pages/{id}/publish')
  @response(200, {description: 'Publish page'})
  async publish(@param.path.string('id') id: string): Promise<Page> {
    return this.cmsService.publishPage(id);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @post('/api/cms/pages/{id}/duplicate')
  @response(200, {description: 'Duplicate page'})
  async duplicate(
    @param.path.string('id') id: string,
    @requestBody() body: {title: string; slug: string},
  ): Promise<Page> {
    return this.cmsService.duplicatePage(id, body.title, body.slug);
  }

  @authenticate('jwt')
  @get('/api/cms/pages/{id}/versions')
  @response(200, {description: 'Page versions'})
  async getVersions(@param.path.string('id') id: string): Promise<any[]> {
    return this.cmsService.contentVersionRepository.find({where: {pageId: id}, order: ['version DESC']});
  }
}
