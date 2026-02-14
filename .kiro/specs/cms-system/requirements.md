# CMS System for Valiarian E-commerce Platform

## Overview
A comprehensive Content Management System (CMS) to enable dynamic content management for the Valiarian e-commerce platform. This system will allow administrators to manage all static content (images, text, backgrounds, sections) through an admin panel, similar to Strapi's functionality.

---

## Business Goals
1. Enable non-technical users to update website content without code changes
2. Reduce development time for content updates
3. Provide version control and preview capabilities for content changes
4. Support multi-language content management (future)
5. Improve content consistency across the platform

---

## User Stories

### As an Administrator
1. I want to manage homepage hero sections (images, headings, descriptions, CTAs) so that I can update promotional content quickly
2. I want to manage product collection sections so that I can feature different products seasonally
3. I want to manage about page content (team, vision, testimonials) so that I can keep company information current
4. I want to manage premium page content so that I can update premium product offerings
5. I want to manage footer content (links, social media, contact info) so that I can maintain accurate business information
6. I want to preview content changes before publishing so that I can ensure quality
7. I want to schedule content changes so that I can plan campaigns in advance
8. I want to see content change history so that I can revert if needed
9. I want to manage media assets (images, videos) in a centralized library
10. I want to manage SEO metadata for all pages so that I can improve search rankings

### As a Frontend Developer
1. I want a consistent API to fetch CMS content so that I can easily integrate it into components
2. I want content to be cached efficiently so that page load times remain fast
3. I want type-safe content models so that I can avoid runtime errors
4. I want fallback content when CMS is unavailable so that the site remains functional

---

## Acceptance Criteria

### 1. Content Models & Structure

#### 1.1 Page Management
- [ ] System supports creating and managing multiple page types (Home, About, Premium, Contact, etc.)
- [ ] Each page has metadata (title, slug, SEO fields, status)
- [ ] Pages can be published, drafted, or scheduled
- [ ] Pages support versioning with rollback capability

#### 1.2 Section Management
- [ ] Pages are composed of reusable sections/blocks
- [ ] Sections have types (Hero, Features, Testimonials, Gallery, etc.)
- [ ] Sections can be reordered via drag-and-drop
- [ ] Sections can be enabled/disabled without deletion
- [ ] Sections support responsive settings (mobile/desktop variations)

#### 1.3 Media Management
- [ ] Centralized media library for all assets
- [ ] Support for images (JPG, PNG, WebP, SVG)
- [ ] Support for videos (MP4, WebM)
- [ ] Automatic image optimization and resizing
- [ ] Image variants generation (thumbnail, medium, large)
- [ ] Alt text and metadata for accessibility
- [ ] Folder organization for media assets
- [ ] Search and filter capabilities

#### 1.4 Content Types
- [ ] Text fields (short text, long text, rich text/HTML)
- [ ] Media fields (single image, image gallery, video)
- [ ] Boolean fields (toggles, checkboxes)
- [ ] Number fields (integers, decimals)
- [ ] Date/Time fields
- [ ] URL fields
- [ ] Color picker fields
- [ ] Relation fields (link to other content)
- [ ] JSON fields (for complex data structures)

### 2. Admin Panel Features

#### 2.1 Content Editor
- [ ] WYSIWYG editor for rich text content
- [ ] Visual page builder with drag-and-drop
- [ ] Live preview of changes
- [ ] Mobile/tablet/desktop preview modes
- [ ] Undo/redo functionality
- [ ] Auto-save drafts

#### 2.2 User Management
- [ ] Role-based access control (Super Admin, Admin, Editor, Viewer)
- [ ] Permission management per content type
- [ ] Audit logs for all content changes
- [ ] User activity tracking

#### 2.3 Publishing Workflow
- [ ] Draft → Review → Publish workflow
- [ ] Schedule publishing for future dates
- [ ] Bulk publish/unpublish operations
- [ ] Content approval system (optional)

### 3. API & Integration

#### 3.1 REST API
- [ ] GET endpoints for all content types
- [ ] Filtering, sorting, pagination support
- [ ] Field selection (sparse fieldsets)
- [ ] Include/exclude relations
- [ ] Response caching with ETags

#### 3.2 Performance
- [ ] Content caching strategy (Redis/Memory)
- [ ] CDN integration for media assets
- [ ] Lazy loading for images
- [ ] API response time < 200ms
- [ ] Support for incremental static regeneration

#### 3.3 Frontend Integration
- [ ] React hooks for fetching CMS content
- [ ] TypeScript types auto-generated from models
- [ ] Error boundaries for CMS failures
- [ ] Fallback content mechanism
- [ ] Content refresh without page reload

### 4. SEO & Analytics

#### 4.1 SEO Management
- [ ] Meta title and description per page
- [ ] Open Graph tags
- [ ] Twitter Card tags
- [ ] Canonical URLs
- [ ] Structured data (JSON-LD)
- [ ] XML sitemap generation

#### 4.2 Analytics Integration
- [ ] Track content performance
- [ ] A/B testing support
- [ ] Click tracking on CTAs
- [ ] Conversion tracking

---

## Content Model Structure (LoopBack 4)

### Core Models

#### 1. **Page Model**
```
- id: string (UUID)
- slug: string (unique, indexed)
- title: string
- description: string
- status: enum (draft, published, scheduled, archived)
- publishedAt: date
- scheduledAt: date (optional)
- seoTitle: string
- seoDescription: string
- seoKeywords: string[]
- ogImage: string (media reference)
- sections: Section[] (relation)
- createdAt: date
- updatedAt: date
- createdBy: string (user reference)
- updatedBy: string (user reference)
- version: number
```

#### 2. **Section Model**
```
- id: string (UUID)
- pageId: string (foreign key)
- type: enum (hero, features, testimonials, gallery, cta, etc.)
- name: string
- order: number
- enabled: boolean
- content: JSON (flexible content structure)
- settings: JSON (responsive, styling options)
- createdAt: date
- updatedAt: date
```

#### 3. **Media Model**
```
- id: string (UUID)
- filename: string
- originalName: string
- mimeType: string
- size: number (bytes)
- width: number (for images)
- height: number (for images)
- url: string (CDN URL)
- thumbnailUrl: string
- mediumUrl: string
- largeUrl: string
- altText: string
- caption: string
- folder: string
- tags: string[]
- createdAt: date
- uploadedBy: string (user reference)
```

#### 4. **ContentVersion Model** (for versioning)
```
- id: string (UUID)
- pageId: string (foreign key)
- version: number
- content: JSON (snapshot of page + sections)
- createdAt: date
- createdBy: string (user reference)
- comment: string (optional)
```

#### 5. **SectionTemplate Model** (reusable templates)
```
- id: string (UUID)
- name: string
- type: string
- description: string
- thumbnail: string (media reference)
- defaultContent: JSON
- schema: JSON (validation schema)
- createdAt: date
```

### Content-Specific Models

#### 6. **HeroSection Model**
```
- id: string (UUID)
- sectionId: string (foreign key)
- backgroundImage: string (media reference)
- backgroundVideo: string (media reference, optional)
- overlayOpacity: number (0-1)
- heading: string
- subheading: string
- description: string (rich text)
- ctaButtons: CTAButton[]
- alignment: enum (left, center, right)
- height: enum (full, auto, custom)
```

#### 7. **FeatureSection Model**
```
- id: string (UUID)
- sectionId: string (foreign key)
- heading: string
- description: string
- features: Feature[]
- layout: enum (grid, list, carousel)
- columns: number
```

#### 8. **TestimonialSection Model**
```
- id: string (UUID)
- sectionId: string (foreign key)
- heading: string
- testimonials: Testimonial[]
- layout: enum (grid, carousel, masonry)
- showRatings: boolean
```

#### 9. **GallerySection Model**
```
- id: string (UUID)
- sectionId: string (foreign key)
- heading: string
- images: string[] (media references)
- layout: enum (grid, masonry, carousel)
- columns: number
- aspectRatio: string
```

#### 10. **CTASection Model**
```
- id: string (UUID)
- sectionId: string (foreign key)
- heading: string
- description: string
- backgroundImage: string (media reference)
- backgroundColor: string
- buttons: CTAButton[]
- alignment: enum (left, center, right)
```

### Supporting Models

#### 11. **CTAButton Model** (embedded)
```
- text: string
- url: string
- style: enum (primary, secondary, outline, text)
- icon: string (optional)
- openInNewTab: boolean
```

#### 12. **Feature Model** (embedded)
```
- icon: string (media reference or icon name)
- title: string
- description: string
- link: string (optional)
```

#### 13. **Testimonial Model** (embedded)
```
- name: string
- role: string
- company: string
- avatar: string (media reference)
- content: string
- rating: number (1-5)
```

#### 14. **NavigationMenu Model**
```
- id: string (UUID)
- name: string (e.g., "Main Menu", "Footer Menu")
- items: MenuItem[]
- location: enum (header, footer, sidebar)
- enabled: boolean
```

#### 15. **MenuItem Model** (embedded)
```
- label: string
- url: string
- icon: string (optional)
- order: number
- parentId: string (for nested menus)
- openInNewTab: boolean
```

#### 16. **SiteSettings Model** (singleton)
```
- id: string (UUID)
- siteName: string
- siteDescription: string
- logo: string (media reference)
- favicon: string (media reference)
- contactEmail: string
- contactPhone: string
- socialMedia: SocialMedia
- footerText: string
- copyrightText: string
- gtmId: string (Google Tag Manager)
- gaId: string (Google Analytics)
```

#### 17. **SocialMedia Model** (embedded)
```
- facebook: string
- instagram: string
- twitter: string
- linkedin: string
- youtube: string
- pinterest: string
```

---

## API Endpoints Structure

### Pages
- `GET /api/cms/pages` - List all pages
- `GET /api/cms/pages/:slug` - Get page by slug
- `GET /api/cms/pages/:id` - Get page by ID
- `POST /api/cms/pages` - Create page (admin)
- `PUT /api/cms/pages/:id` - Update page (admin)
- `DELETE /api/cms/pages/:id` - Delete page (admin)
- `POST /api/cms/pages/:id/publish` - Publish page (admin)
- `POST /api/cms/pages/:id/duplicate` - Duplicate page (admin)
- `GET /api/cms/pages/:id/versions` - Get page versions (admin)
- `POST /api/cms/pages/:id/revert/:version` - Revert to version (admin)

### Sections
- `GET /api/cms/sections` - List sections
- `GET /api/cms/sections/:id` - Get section
- `POST /api/cms/sections` - Create section (admin)
- `PUT /api/cms/sections/:id` - Update section (admin)
- `DELETE /api/cms/sections/:id` - Delete section (admin)
- `PUT /api/cms/sections/:id/reorder` - Reorder sections (admin)

### Media
- `GET /api/cms/media` - List media
- `GET /api/cms/media/:id` - Get media
- `POST /api/cms/media/upload` - Upload media (admin)
- `PUT /api/cms/media/:id` - Update media metadata (admin)
- `DELETE /api/cms/media/:id` - Delete media (admin)
- `GET /api/cms/media/folders` - List folders (admin)

### Templates
- `GET /api/cms/templates` - List section templates
- `GET /api/cms/templates/:id` - Get template
- `POST /api/cms/templates` - Create template (admin)

### Settings
- `GET /api/cms/settings` - Get site settings
- `PUT /api/cms/settings` - Update site settings (admin)

### Navigation
- `GET /api/cms/navigation/:location` - Get navigation menu
- `PUT /api/cms/navigation/:id` - Update navigation (admin)

---

## Technical Requirements

### Backend (LoopBack 4)
1. **Database**: PostgreSQL with JSONB support for flexible content
2. **File Storage**: AWS S3 or local storage with CDN integration
3. **Caching**: Redis for API response caching
4. **Image Processing**: Sharp library for image optimization
5. **Validation**: JSON Schema validation for content
6. **Authentication**: JWT-based auth with role-based access
7. **Logging**: Winston for audit logs

### Frontend (React)
1. **State Management**: React Query for CMS data fetching
2. **Type Safety**: TypeScript with auto-generated types
3. **Caching**: React Query cache + Service Worker
4. **Error Handling**: Error boundaries with fallback content
5. **Loading States**: Skeleton screens for CMS content
6. **Image Optimization**: Next.js Image component or similar

### Admin Panel (React)
1. **UI Framework**: Material-UI (already in use)
2. **Form Management**: React Hook Form
3. **Rich Text Editor**: TinyMCE or Slate.js
4. **Drag & Drop**: react-beautiful-dnd or dnd-kit
5. **Image Upload**: Dropzone with preview
6. **Preview**: iframe-based preview with responsive controls

---

## Performance Targets
- API response time: < 200ms (cached), < 500ms (uncached)
- Image loading: Progressive/lazy loading
- Page load time: < 2s (with CMS content)
- Admin panel load time: < 3s
- Media upload: Support files up to 10MB
- Concurrent users: Support 100+ simultaneous editors

---

## Security Requirements
1. **Authentication**: JWT tokens with refresh mechanism
2. **Authorization**: Role-based access control (RBAC)
3. **Input Validation**: Sanitize all user inputs
4. **XSS Prevention**: Content Security Policy headers
5. **CSRF Protection**: CSRF tokens for state-changing operations
6. **Rate Limiting**: API rate limits per user/IP
7. **File Upload Security**: Validate file types, scan for malware
8. **Audit Logging**: Log all content changes with user info

---

## Migration Strategy
1. **Phase 1**: Create CMS models and API endpoints
2. **Phase 2**: Build admin panel for content management
3. **Phase 3**: Migrate existing static content to CMS
4. **Phase 4**: Update frontend components to fetch from CMS
5. **Phase 5**: Add advanced features (versioning, scheduling, etc.)

---

## Success Metrics
1. Content update time reduced by 80%
2. Zero code deployments for content changes
3. 100% of static content managed through CMS
4. < 5 minutes to create a new landing page
5. 95%+ admin user satisfaction score

---

## Future Enhancements
1. Multi-language support (i18n)
2. A/B testing framework
3. Personalization engine
4. Workflow automation
5. AI-powered content suggestions
6. GraphQL API support
7. Webhooks for content changes
8. Content import/export (JSON, CSV)
9. Advanced analytics dashboard
10. Mobile app for content management

---

## Dependencies
- LoopBack 4 framework
- PostgreSQL database
- Redis cache
- AWS S3 (or alternative storage)
- Sharp (image processing)
- React Query
- Material-UI
- TypeScript

---

## Risks & Mitigation
1. **Risk**: Performance degradation with large content
   - **Mitigation**: Implement aggressive caching, pagination, lazy loading

2. **Risk**: Content corruption or accidental deletion
   - **Mitigation**: Versioning system, soft deletes, backup strategy

3. **Risk**: Security vulnerabilities in file uploads
   - **Mitigation**: File type validation, malware scanning, size limits

4. **Risk**: Complex content structures causing frontend errors
   - **Mitigation**: JSON schema validation, TypeScript types, error boundaries

5. **Risk**: Learning curve for non-technical users
   - **Mitigation**: Intuitive UI, documentation, training materials

---

## Timeline Estimate
- **Phase 1** (Models & API): 2-3 weeks
- **Phase 2** (Admin Panel): 3-4 weeks
- **Phase 3** (Content Migration): 1-2 weeks
- **Phase 4** (Frontend Integration): 2-3 weeks
- **Phase 5** (Advanced Features): 2-3 weeks
- **Total**: 10-15 weeks

---

## Notes
- This CMS should be flexible enough to support future content types
- Consider using a headless CMS approach for maximum flexibility
- Ensure all content is SEO-friendly and accessible
- Plan for scalability from the start
- Document all content models and API endpoints thoroughly
