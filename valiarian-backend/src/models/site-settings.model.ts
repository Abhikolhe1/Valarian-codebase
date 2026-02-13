import {Entity, model, property} from '@loopback/repository';

export interface SocialMedia {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  pinterest?: string;
}

@model({
  settings: {
    postgresql: {
      schema: 'cms',
      table: 'site_settings',
    },
  },
})
export class SiteSettings extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    postgresql: {
      dataType: 'uuid',
    },
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  siteName: string;

  @property({
    type: 'string',
  })
  siteDescription?: string;

  @property({
    type: 'string',
  })
  logo?: string;

  @property({
    type: 'string',
  })
  favicon?: string;

  @property({
    type: 'string',
  })
  contactEmail?: string;

  @property({
    type: 'string',
  })
  contactPhone?: string;

  @property({
    type: 'object',
    postgresql: {
      dataType: 'jsonb',
    },
  })
  socialMedia?: SocialMedia;

  @property({
    type: 'string',
  })
  footerText?: string;

  @property({
    type: 'string',
  })
  copyrightText?: string;

  @property({
    type: 'string',
  })
  gtmId?: string;

  @property({
    type: 'string',
  })
  gaId?: string;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  createdAt?: Date;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  updatedAt?: Date;

  constructor(data?: Partial<SiteSettings>) {
    super(data);
  }
}

export interface SiteSettingsRelations {
  // No relations defined yet
}

export type SiteSettingsWithRelations = SiteSettings & SiteSettingsRelations;
