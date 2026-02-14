# CMS System - Database Structure & Architecture

## Database Schema Overview

This document defines the complete database structure for the Valiarian CMS system using LoopBack 4 models.

---

## Entity Relationship Diagram (ERD)

```
┌─────────────────┐
│     Page        │
├─────────────────┤
│ id (PK)         │
│ slug (unique)   │
│ title           │
│ status          │
│ publishedAt     │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐
│    Section      │
├─────────────────┤
│ id (PK)         │
│ pageId (FK)     │
│ type            │
│ order           │
│ content (JSON)  │
└────────┬────────┘
         │
         │ N:M (via content JSON)
         │
┌────────▼────────┐
│     Media       │
├─────────────────┤
│ id (PK)         │
│ filename        │
│ url             │
│ mimeType        │
└─────────────────┘

┌─────────────────┐
│ ContentVersion  │
├─────────────────┤
│ id (PK)         │
│ pageId (FK)     │
│ version         │
│ content (JSON)  │
└─────────────────┘

┌─────────────────┐
│ SiteSettings    │
├─────────────────┤
│ id (PK)         │
│ siteName        │
│ logo (FK)       │
│ socialMedia     │
└─────────────────┘

┌─────────────────┐
│ NavigationMenu  │
├─────────────────┤
│ id (PK)         │
│ name            │
│ location        │
│ items (JSON)    │
└─────────────────┘
```

---

## LoopBack 4 Model Definitions

### 1. Page Model

**File**: `src/models/page.model.ts`

```typescript
@model({
  settings: {
    postgresql: { schema: 'cms', table: 'pages' },
    indexes: {
      slug_idx: { keys: { slug: 1 }, options: { unique: true } },
      status_idx: { keys: { status: 1 } },
      publishedAt_idx: { keys: { publishedAt: -1 } }
    }
  }
})
export class Page extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @property({
    type: 'string',
    required: true,
    index: { unique: true },
  })
  slug: string;

  @property({
    type: 'string',
    required: true,
  })
  title: string;

  @property({
    type: 'string',
  })
  description?: string;

  @property({
    type: 'string',
    required: true,
    default: 'draft',
    jsonSchema: {
      enum: ['draft', 'published', 'scheduled', 'archived'],
    },
  })
  status: 'draft' | 'published' | 'scheduled' | 'archived';

  @property({
    type: 'date',
  })
  publishedAt?: Date;

  @property({
    type: 'date',
  })
  scheduledAt?: Date;

  @property({
    type: 'string',
  })
  seoTitle?: string;

  @property({
    type: 'string',
  })
  seoDescription?: string;

  @property({
    type: 'array',
    itemType: 'string',
  })
  seoKeywords?: string[];

  @property({
    type: 'string',
  })
  ogImage?: string;

  @property({
    type: 'string',
  })
  ogImageAlt?: string;

  @property({
    type: 'object',
  })
  structuredData?: object;

  @property({
    type: 'number',
    default: 1,
  })
  version: number;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  createdAt: Date;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  updatedAt: Date;

  @property({
    type: 'string',
  })
  createdBy?: string;

  @property({
    type: 'string',
  })
  updatedBy?: string;

  @hasMany(() => Section, { keyTo: 'pageId' })
  sections: Section[];

  @hasMany(() => ContentVersion, { keyTo: 'pageId' })
  versions: ContentVersion[];

  constructor(data?: Partial<Page>) {
    super(data);
  }
}
```

---

### 2. Section Model

**File**: `src/models/section.model.ts`

```typescript
@model({
  settings: {
    postgresql: { schema: 'cms', table: 'sections' },
    indexes: {
      pageId_order_idx: { keys: { pageId: 1, order: 1 } },
      type_idx: { keys: { type: 1 } }
    }
  }
})
export class Section extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  pageId: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: [
        'hero',
        'features',
        'testimonials',
        'gallery',
        'cta',
        'text',
        'video',
        'faq',
        'team',
        'pricing',
        'contact',
        'custom'
      ],
    },
  })
  type: string;

  @property({
    type: 'string',
    required: true,
  })
  name: string;

  @property({
    type: 'number',
    required: true,
    default: 0,
  })
  order: number;

  @property({
    type: 'boolean',
    default: true,
  })
  enabled: boolean;

  @property({
    type: 'object',
    required: true,
    postgresql: {
      dataType: 'jsonb',
    },
  })
  content: object;

  @property({
    type: 'object',
    postgresql: {
      dataType: 'jsonb',
    },
  })
  settings?: object;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  createdAt: Date;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  updatedAt: Date;

  @belongsTo(() => Page)
  page: Page;

  constructor(data?: Partial<Section>) {
    super(data);
  }
}
```

---

### 3. Media Model

**File**: `src/models/media.model.ts`

```typescript
@model({
  settings: {
    postgresql: { schema: 'cms', table: 'media' },
    indexes: {
      folder_idx: { keys: { folder: 1 } },
      mimeType_idx: { keys: { mimeType: 1 } },
      createdAt_idx: { keys: { createdAt: -1 } }
    }
  }
})
export class Media extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  filename: string;

  @property({
    type: 'string',
    required: true,
  })
  originalName: string;

  @property({
    type: 'string',
    required: true,
  })
  mimeType: string;

  @property({
    type: 'number',
    required: true,
  })
  size: number;

  @property({
    type: 'number',
  })
  width?: number;

  @property({
    type: 'number',
  })
  height?: number;

  @property({
    type: 'string',
    required: true,
  })
  url: string;

  @property({
    type: 'string',
  })
  thumbnailUrl?: string;

  @property({
    type: 'string',
  })
  mediumUrl?: string;

  @property({
    type: 'string',
  })
  largeUrl?: string;

  @property({
    type: 'string',
  })
  altText?: string;

  @property({
    type: 'string',
  })
  caption?: string;

  @property({
    type: 'string',
    default: '/',
  })
  folder: string;

  @property({
    type: 'array',
    itemType: 'string',
  })
  tags?: string[];

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  createdAt: Date;

  @property({
    type: 'string',
  })
  uploadedBy?: string;

  constructor(data?: Partial<Media>) {
    super(data);
  }
}
```

---

### 4. ContentVersion Model

**File**: `src/models/content-version.model.ts`

```typescript
@model({
  settings: {
    postgresql: { schema: 'cms', table: 'content_versions' },
    indexes: {
      pageId_version_idx: { keys: { pageId: 1, version: -1 } }
    }
  }
})
export class ContentVersion extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  pageId: string;

  @property({
    type: 'number',
    required: true,
  })
  version: number;

  @property({
    type: 'object',
    required: true,
    postgresql: {
      dataType: 'jsonb',
    },
  })
  content: object;

  @property({
    type: 'string',
  })
  comment?: string;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  createdAt: Date;

  @property({
    type: 'string',
  })
  createdBy?: string;

  @belongsTo(() => Page)
  page: Page;

  constructor(data?: Partial<ContentVersion>) {
    super(data);
  }
}
```

---

### 5. SectionTemplate Model

**File**: `src/models/section-template.model.ts`

```typescript
@model({
  settings: {
    postgresql: { schema: 'cms', table: 'section_templates' }
  }
})
export class SectionTemplate extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  name: string;

  @property({
    type: 'string',
    required: true,
  })
  type: string;

  @property({
    type: 'string',
  })
  description?: string;

  @property({
    type: 'string',
  })
  thumbnail?: string;

  @property({
    type: 'object',
    required: true,
    postgresql: {
      dataType: 'jsonb',
    },
  })
  defaultContent: object;

  @property({
    type: 'object',
    postgresql: {
      dataType: 'jsonb',
    },
  })
  schema?: object;

  @property({
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  createdAt: Date;

  constructor(data?: Partial<SectionTemplate>) {
    super(data);
  }
}
```

---

### 6. NavigationMenu Model

**File**: `src/models/navigation-menu.model.ts`

```typescript
@model({
  settings: {
    postgresql: { schema: 'cms', table: 'navigation_menus' }
  }
})
export class NavigationMenu extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  name: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: ['header', 'footer', 'sidebar', 'mobile'],
    },
  })
  location: string;

  @property({
    type: 'array',
    itemType: 'object',
    postgresql: {
      dataType: 'jsonb',
    },
  })
  items: MenuItem[];

  @property({
    type: 'boolean',
    default: true,
  })
  enabled: boolean;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  createdAt: Date;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  updatedAt: Date;

  constructor(data?: Partial<NavigationMenu>) {
    super(data);
  }
}

// Embedded model
export class MenuItem {
  label: string;
  url: string;
  icon?: string;
  order: number;
  parentId?: string;
  openInNewTab: boolean;
  children?: MenuItem[];
}
```

---

### 7. SiteSettings Model

**File**: `src/models/site-settings.model.ts`

```typescript
@model({
  settings: {
    postgresql: { schema: 'cms', table: 'site_settings' }
  }
})
export class SiteSettings extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
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
    type: 'object',
    postgresql: {
      dataType: 'jsonb',
    },
  })
  customScripts?: object;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  updatedAt: Date;

  constructor(data?: Partial<SiteSettings>) {
    super(data);
  }
}

// Embedded model
export class SocialMedia {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  pinterest?: string;
  tiktok?: string;
}
```

---

## Content Structure Examples

### Hero Section Content JSON
```json
{
  "backgroundImage": "media-id-123",
  "backgroundVideo": null,
  "overlayOpacity": 0.4,
  "heading": "Welcome to Valiarian",
  "subheading": "Premium Quality Clothing",
  "description": "<p>Discover our exclusive collection</p>",
  "ctaButtons": [
    {
      "text": "Shop Now",
      "url": "/products",
      "style": "primary",
      "icon": "shopping-cart",
      "openInNewTab": false
    },
    {
      "text": "Learn More",
      "url": "/about",
      "style": "outline",
      "icon": null,
      "openInNewTab": false
    }
  ],
  "alignment": "center",
  "height": "full",
  "mobileSettings": {
    "heading": "Welcome",
    "showVideo": false
  }
}
```

### Features Section Content JSON
```json
{
  "heading": "Why Choose Us",
  "description": "Premium quality and exceptional service",
  "features": [
    {
      "icon": "media-id-456",
      "title": "Premium Quality",
      "description": "100% authentic materials",
      "link": "/quality"
    },
    {
      "icon": "media-id-789",
      "title": "Fast Shipping",
      "description": "Delivered within 3-5 days",
      "link": "/shipping"
    }
  ],
  "layout": "grid",
  "columns": 3
}
```

### Gallery Section Content JSON
```json
{
  "heading": "Our Collection",
  "images": [
    {
      "mediaId": "media-id-111",
      "caption": "Summer Collection 2024",
      "link": "/collections/summer"
    },
    {
      "mediaId": "media-id-222",
      "caption": "Winter Collection 2024",
      "link": "/collections/winter"
    }
  ],
  "layout": "masonry",
  "columns": 4,
  "aspectRatio": "16:9"
}
```

---

## Repository Structure

```
valiarian-backend/src/
├── models/
│   ├── page.model.ts
│   ├── section.model.ts
│   ├── media.model.ts
│   ├── content-version.model.ts
│   ├── section-template.model.ts
│   ├── navigation-menu.model.ts
│   └── site-settings.model.ts
├── repositories/
│   ├── page.repository.ts
│   ├── section.repository.ts
│   ├── media.repository.ts
│   ├── content-version.repository.ts
│   ├── section-template.repository.ts
│   ├── navigation-menu.repository.ts
│   └── site-settings.repository.ts
├── controllers/
│   ├── cms-page.controller.ts
│   ├── cms-section.controller.ts
│   ├── cms-media.controller.ts
│   ├── cms-template.controller.ts
│   ├── cms-navigation.controller.ts
│   └── cms-settings.controller.ts
├── services/
│   ├── cms.service.ts
│   ├── media-upload.service.ts
│   ├── image-processing.service.ts
│   ├── cache.service.ts
│   └── version-control.service.ts
└── datasources/
    └── cms.datasource.ts
```

---

## Database Migrations

### Initial Schema Migration
```sql
-- Create CMS schema
CREATE SCHEMA IF NOT EXISTS cms;

-- Create pages table
CREATE TABLE cms.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP,
  scheduled_at TIMESTAMP,
  seo_title VARCHAR(500),
  seo_description TEXT,
  seo_keywords TEXT[],
  og_image VARCHAR(500),
  og_image_alt VARCHAR(255),
  structured_data JSONB,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- Create sections table
CREATE TABLE cms.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES cms.pages(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  content JSONB NOT NULL,
  settings JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create media table
CREATE TABLE cms.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(500) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL,
  width INTEGER,
  height INTEGER,
  url VARCHAR(1000) NOT NULL,
  thumbnail_url VARCHAR(1000),
  medium_url VARCHAR(1000),
  large_url VARCHAR(1000),
  alt_text VARCHAR(500),
  caption TEXT,
  folder VARCHAR(500) DEFAULT '/',
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  uploaded_by UUID
);

-- Create content_versions table
CREATE TABLE cms.content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES cms.pages(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content JSONB NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID
);

-- Create section_templates table
CREATE TABLE cms.section_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  thumbnail VARCHAR(500),
  default_content JSONB NOT NULL,
  schema JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create navigation_menus table
CREATE TABLE cms.navigation_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  location VARCHAR(50) NOT NULL,
  items JSONB,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create site_settings table
CREATE TABLE cms.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name VARCHAR(255) NOT NULL,
  site_description TEXT,
  logo VARCHAR(500),
  favicon VARCHAR(500),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  social_media JSONB,
  footer_text TEXT,
  copyright_text VARCHAR(500),
  gtm_id VARCHAR(50),
  ga_id VARCHAR(50),
  custom_scripts JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_pages_slug ON cms.pages(slug);
CREATE INDEX idx_pages_status ON cms.pages(status);
CREATE INDEX idx_pages_published_at ON cms.pages(published_at DESC);
CREATE INDEX idx_sections_page_id_order ON cms.sections(page_id, "order");
CREATE INDEX idx_sections_type ON cms.sections(type);
CREATE INDEX idx_media_folder ON cms.media(folder);
CREATE INDEX idx_media_mime_type ON cms.media(mime_type);
CREATE INDEX idx_media_created_at ON cms.media(created_at DESC);
CREATE INDEX idx_content_versions_page_id_version ON cms.content_versions(page_id, version DESC);
```

---

## Caching Strategy

### Redis Cache Keys
```
cms:page:{slug}                    - Page with sections (TTL: 1 hour)
cms:page:{id}                      - Page by ID (TTL: 1 hour)
cms:sections:{pageId}              - All sections for a page (TTL: 1 hour)
cms:media:{id}                     - Media metadata (TTL: 24 hours)
cms:navigation:{location}          - Navigation menu (TTL: 6 hours)
cms:settings                       - Site settings (TTL: 12 hours)
cms:templates                      - Section templates (TTL: 24 hours)
```

### Cache Invalidation
- Invalidate on content update/publish
- Invalidate related caches (e.g., page cache when section updates)
- Use cache tags for bulk invalidation

---

## File Storage Structure

```
/media/
├── images/
│   ├── original/
│   │   └── {year}/{month}/{filename}
│   ├── thumbnails/
│   │   └── {year}/{month}/{filename}
│   ├── medium/
│   │   └── {year}/{month}/{filename}
│   └── large/
│       └── {year}/{month}/{filename}
├── videos/
│   └── {year}/{month}/{filename}
└── documents/
    └── {year}/{month}/{filename}
```

---

## Notes
- Use PostgreSQL JSONB for flexible content storage
- Implement database-level constraints for data integrity
- Use transactions for multi-table operations
- Consider partitioning for large tables (media, versions)
- Implement soft deletes for important data
- Use database triggers for audit logging
- Regular backups with point-in-time recovery
