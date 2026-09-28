import {Entity, model, property} from '@loopback/repository';

export type BlogPostStatus = 'draft' | 'published' | 'scheduled' | 'archived';

@model({
  settings: {
    postgresql: {schema: 'cms', table: 'blog_posts'},
    indexes: {
      blogPostsSlugIdx: {keys: {slug: 1}, options: {unique: true}},
      blogPostsStatusIdx: {keys: {status: 1}},
      blogPostsPublishedAtIdx: {keys: {publishedAt: -1}},
    },
  },
})
export class BlogPost extends Entity {
  @property({type: 'string', id: true, generated: false, postgresql: {dataType: 'uuid'}})
  id: string;

  @property({type: 'string', required: true})
  title: string;

  @property({type: 'string', required: true})
  slug: string;

  @property({type: 'string', required: true})
  excerpt: string;

  @property({type: 'string', required: true, postgresql: {dataType: 'text'}})
  content: string;

  @property({type: 'string'})
  coverUrl?: string;

  @property({type: 'string'})
  coverAlt?: string;

  @property({type: 'string', default: 'Valiarian Editorial Team'})
  authorName: string;

  @property({type: 'string'})
  authorAvatarUrl?: string;

  @property({type: 'string'})
  category?: string;

  @property({type: 'array', itemType: 'string'})
  tags?: string[];

  @property({type: 'string', required: true, default: 'draft', jsonSchema: {enum: ['draft', 'published', 'scheduled', 'archived']}})
  status: BlogPostStatus;

  @property({type: 'date'})
  publishedAt?: Date;

  @property({type: 'date'})
  scheduledAt?: Date;

  @property({type: 'string'})
  metaTitle?: string;

  @property({type: 'string'})
  metaDescription?: string;

  @property({type: 'array', itemType: 'string'})
  metaKeywords?: string[];

  @property({type: 'string'})
  canonicalUrl?: string;

  @property({type: 'boolean', default: false})
  noIndex: boolean;

  @property({type: 'number', default: 0})
  totalViews: number;

  @property({type: 'number', default: 1})
  readingMinutes: number;

  @property({type: 'string'})
  createdBy?: string;

  @property({type: 'string'})
  updatedBy?: string;

  @property({type: 'date', defaultFn: 'now'})
  createdAt: Date;

  @property({type: 'date', defaultFn: 'now'})
  updatedAt: Date;

  constructor(data?: Partial<BlogPost>) {
    super(data);
  }
}

export interface BlogPostRelations {}
export type BlogPostWithRelations = BlogPost & BlogPostRelations;
