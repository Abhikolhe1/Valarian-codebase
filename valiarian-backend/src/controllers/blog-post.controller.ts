import {authenticate, AuthenticationBindings} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {del, get, HttpErrors, param, patch, post, requestBody} from '@loopback/rest';
import {UserProfile} from '@loopback/security';
import {v4 as uuidv4} from 'uuid';
import {authorize} from '../authorization';
import {BlogPost, BlogPostStatus} from '../models';
import {BlogPostRepository} from '../repositories';

type BlogInput = Partial<BlogPost> & Pick<BlogPost, 'title' | 'excerpt' | 'content'>;

export class BlogPostController {
  constructor(
    @repository(BlogPostRepository)
    public blogPostRepository: BlogPostRepository,
  ) {}

  @get('/api/post/list')
  async publicList(
    @param.query.string('query') query?: string,
    @param.query.number('limit') limit = 50,
  ): Promise<{posts: object[]}> {
    const now = new Date();
    const where: any = {
      and: [
        {noIndex: false},
        {
          or: [
            {status: 'published'},
            {and: [{status: 'scheduled'}, {scheduledAt: {lte: now}}]},
          ],
        },
      ],
    };
    if (query?.trim()) {
      where.and.push({
        or: [
          {title: {like: `%${query.trim()}%`, options: 'i'}},
          {excerpt: {like: `%${query.trim()}%`, options: 'i'}},
          {category: {like: `%${query.trim()}%`, options: 'i'}},
        ],
      });
    }
    const posts = await this.blogPostRepository.find({
      where,
      order: ['publishedAt DESC', 'createdAt DESC'],
      limit: Math.min(Math.max(limit, 1), 100),
    });
    return {posts: posts.map(item => this.toPublicPost(item))};
  }

  @get('/api/post/details')
  async publicDetails(
    @param.query.string('slug') slug?: string,
    @param.query.string('title') title?: string,
  ): Promise<{post: object}> {
    const key = slug || title;
    if (!key) throw new HttpErrors.BadRequest('A post slug is required');
    const normalized = this.slugify(key);
    const postItem = await this.blogPostRepository.findOne({
      where: {
        and: [
          {or: [{slug: normalized}, {title: key}]},
          {or: [{status: 'published'}, {and: [{status: 'scheduled'}, {scheduledAt: {lte: new Date()}}]}]},
        ],
      },
    });
    if (!postItem) throw new HttpErrors.NotFound('Article not found');
    await this.blogPostRepository.updateById(postItem.id, {totalViews: (postItem.totalViews || 0) + 1});
    return {post: this.toPublicPost(postItem)};
  }

  @get('/api/post/latest')
  async latest(@param.query.string('title') current?: string): Promise<{latestPosts: object[]}> {
    const result = await this.publicList(undefined, 5);
    const currentSlug = current ? this.slugify(current) : '';
    return {latestPosts: result.posts.filter((item: any) => item.slug !== currentSlug).slice(0, 4)};
  }

  @get('/api/post/search')
  async search(@param.query.string('query') query = ''): Promise<{results: object[]}> {
    const result = await this.publicList(query, 10);
    return {results: result.posts};
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @get('/api/admin/blog-posts')
  async adminList(
    @param.query.string('status') status?: BlogPostStatus,
    @param.query.string('query') query?: string,
  ): Promise<{posts: BlogPost[]}> {
    const and: any[] = [];
    if (status) and.push({status});
    if (query?.trim()) and.push({or: [{title: {like: `%${query.trim()}%`, options: 'i'}}, {slug: {like: `%${query.trim()}%`, options: 'i'}}]});
    const posts = await this.blogPostRepository.find({
      where: and.length ? {and} : {},
      order: ['updatedAt DESC'],
    });
    return {posts};
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @get('/api/admin/blog-posts/{id}')
  async adminDetails(@param.path.string('id') id: string): Promise<BlogPost> {
    return this.blogPostRepository.findById(id);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @post('/api/admin/blog-posts')
  async create(
    @inject(AuthenticationBindings.CURRENT_USER) user: UserProfile,
    @requestBody() input: BlogInput,
  ): Promise<BlogPost> {
    const prepared = await this.prepare(input);
    return this.blogPostRepository.create({
      ...prepared,
      id: uuidv4(),
      createdBy: `${user.id}`,
      updatedBy: `${user.id}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @patch('/api/admin/blog-posts/{id}')
  async update(
    @inject(AuthenticationBindings.CURRENT_USER) user: UserProfile,
    @param.path.string('id') id: string,
    @requestBody() input: BlogInput,
  ): Promise<BlogPost> {
    await this.blogPostRepository.findById(id);
    const prepared = await this.prepare(input, id);
    await this.blogPostRepository.updateById(id, {...prepared, updatedBy: `${user.id}`, updatedAt: new Date()});
    return this.blogPostRepository.findById(id);
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin', 'editor']})
  @del('/api/admin/blog-posts/{id}', {responses: {'204': {description: 'Article deleted'}}})
  async remove(@param.path.string('id') id: string): Promise<void> {
    await this.blogPostRepository.deleteById(id);
  }

  private async prepare(input: BlogInput, currentId?: string): Promise<Partial<BlogPost>> {
    const title = input.title?.trim();
    if (!title || !input.excerpt?.trim() || !input.content?.trim()) {
      throw new HttpErrors.UnprocessableEntity('Title, excerpt and content are required');
    }
    const slug = this.slugify(input.slug || title);
    const duplicate = await this.blogPostRepository.findOne({where: {slug}});
    if (duplicate && duplicate.id !== currentId) throw new HttpErrors.Conflict('This article slug is already in use');
    const content = this.sanitizeHtml(input.content);
    const status = input.status || 'draft';
    const publishedAt = status === 'published' ? input.publishedAt || new Date() : input.publishedAt;
    return {
      ...input,
      title,
      slug,
      excerpt: input.excerpt.trim(),
      content,
      status,
      publishedAt,
      readingMinutes: Math.max(1, Math.ceil(this.plainText(content).split(/\s+/).filter(Boolean).length / 220)),
      metaTitle: (input.metaTitle || title).trim().slice(0, 70),
      metaDescription: (input.metaDescription || input.excerpt).trim().slice(0, 170),
      canonicalUrl: input.canonicalUrl?.trim() || `https://valiarian.com/blog/${slug}`,
      tags: (input.tags || []).map(tag => tag.trim()).filter(Boolean),
      metaKeywords: (input.metaKeywords || []).map(tag => tag.trim()).filter(Boolean),
      coverAlt: (input.coverAlt || title).trim(),
      authorName: input.authorName?.trim() || 'Valiarian Editorial Team',
    };
  }

  private slugify(value: string): string {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  private sanitizeHtml(value: string): string {
    return value
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/javascript\s*:/gi, '');
  }

  private plainText(value: string): string {
    return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private toPublicPost(item: BlogPost): object {
    return {
      ...item.toJSON(),
      description: item.excerpt,
      coverUrl: item.coverUrl || '',
      publish: 'published',
      author: {name: item.authorName, avatarUrl: item.authorAvatarUrl || ''},
      totalComments: 0,
      totalShares: 0,
      totalFavorites: 0,
      favoritePerson: [],
      comments: [],
    };
  }
}
