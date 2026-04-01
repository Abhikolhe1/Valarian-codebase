/**
 * CMS Type Definitions
 * Auto-generated TypeScript types for CMS API responses
 * Based on backend LoopBack 4 models
 */

// ============================================================================
// ENUMS
// ============================================================================

export type PageStatus = 'draft' | 'published' | 'scheduled' | 'archived';

export type SectionType =
  | 'premium-hero'
  | 'premium-product-showcase'
  | 'premium-fabric-details'
  | 'premium-statement'
  | 'premium-feature-grid'
  | 'premium-confidence'
  | 'premium-reserve-cta'
  | 'premium-countdown'
  | 'hero'
  | 'features'
  | 'testimonials'
  | 'gallery'
  | 'cta'
  | 'text'
  | 'video'
  | 'faq'
  | 'team'
  | 'pricing'
  | 'contact'
  | 'custom';

export type NavigationLocation = 'header' | 'footer' | 'sidebar' | 'mobile';

// ============================================================================
// CORE MODELS
// ============================================================================

/**
 * Page Model
 * Represents a CMS page with metadata and SEO fields
 */
export interface Page {
  id: string;
  slug: string;
  title: string;
  description?: string;
  status: PageStatus;
  publishedAt?: string | Date;
  scheduledAt?: string | Date;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  ogImage?: string;
  ogImageAlt?: string;
  structuredData?: Record<string, any>;
  version: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy?: string;
  updatedBy?: string;
  sections?: Section[];
  versions?: ContentVersion[];
}

/**
 * Section Model
 * Represents a content section within a page
 */
export interface Section {
  id: string;
  pageId: string;
  type: SectionType;
  name: string;
  order: number;
  enabled: boolean;
  content: Record<string, any>;
  settings?: Record<string, any>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  page?: Page;
}

/**
 * Media Model
 * Represents a media asset (image, video, etc.)
 */
export interface Media {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  url: string;
  thumbnailUrl?: string;
  mediumUrl?: string;
  largeUrl?: string;
  altText?: string;
  caption?: string;
  folder: string;
  tags?: string[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
  uploadedBy?: string;
}

/**
 * Content Version Model
 * Represents a version snapshot of a page
 */
export interface ContentVersion {
  id: string;
  pageId: string;
  version: number;
  content: Record<string, any>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy?: string;
  comment?: string;
  page?: Page;
}

/**
 * Section Template Model
 * Represents a reusable section template
 */
export interface SectionTemplate {
  id: string;
  name: string;
  type: SectionType;
  description?: string;
  thumbnail?: string;
  defaultContent: Record<string, any>;
  schema?: Record<string, any>;
  createdAt?: string | Date;
  createdBy?: string;
}

/**
 * Navigation Menu Model
 * Represents a navigation menu with items
 */
export interface NavigationMenu {
  id: string;
  name: string;
  location: NavigationLocation;
  items?: MenuItem[];
  enabled: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Menu Item
 * Represents a single navigation menu item
 */
export interface MenuItem {
  label: string;
  url: string;
  icon?: string;
  order: number;
  parentId?: string;
  openInNewTab: boolean;
  children?: MenuItem[];
}

/**
 * Site Settings Model
 * Represents global site configuration (singleton)
 */
export interface SiteSettings {
  id: string;
  siteName: string;
  siteDescription?: string;
  logo?: string;
  favicon?: string;
  contactEmail?: string;
  contactPhone?: string;
  socialMedia?: SocialMedia;
  footerText?: string;
  copyrightText?: string;
  gtmId?: string;
  gaId?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Social Media Links
 * Embedded in Site Settings
 */
export interface SocialMedia {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  pinterest?: string;
}

// ============================================================================
// SECTION CONTENT TYPES
// ============================================================================

/**
 * CTA Button
 * Used in Hero, CTA, and other sections
 */
export interface CTAButton {
  text: string;
  url: string;
  style: 'primary' | 'secondary' | 'outline' | 'text';
  icon?: string;
  openInNewTab: boolean;
}

/**
 * Feature Item
 * Used in Features section
 */
export interface Feature {
  icon?: string;
  title: string;
  description: string;
  link?: string;
}

/**
 * Testimonial Item
 * Used in Testimonials section
 */
export interface Testimonial {
  name: string;
  role: string;
  company: string;
  avatar?: string;
  content: string;
  rating: number;
}

/**
 * Hero Section Content
 */
export interface HeroSectionContent {
  backgroundImage?: string;
  backgroundVideo?: string;
  overlayOpacity?: number;
  heading: string;
  subheading?: string;
  description?: string;
  ctaButtons?: CTAButton[];
  alignment?: 'left' | 'center' | 'right';
  height?: 'full' | 'auto' | 'custom';
}

/**
 * Features Section Content
 */
export interface FeaturesSectionContent {
  heading?: string;
  description?: string;
  features: Feature[];
  layout?: 'grid' | 'list' | 'carousel';
  columns?: number;
}

/**
 * Testimonials Section Content
 */
export interface TestimonialsSectionContent {
  heading?: string;
  testimonials: Testimonial[];
  layout?: 'grid' | 'carousel' | 'masonry';
  showRatings?: boolean;
}

/**
 * Gallery Section Content
 */
export interface GallerySectionContent {
  heading?: string;
  images: string[];
  layout?: 'grid' | 'masonry' | 'carousel';
  columns?: number;
  aspectRatio?: string;
}

/**
 * CTA Section Content
 */
export interface CTASectionContent {
  heading: string;
  description?: string;
  backgroundImage?: string;
  backgroundColor?: string;
  buttons?: CTAButton[];
  alignment?: 'left' | 'center' | 'right';
}

/**
 * Text Section Content
 */
export interface TextSectionContent {
  heading?: string;
  content: string;
  alignment?: 'left' | 'center' | 'right';
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Paginated Response
 * Generic type for paginated API responses
 */
export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Pages List Response
 */
export interface PagesListResponse {
  pages: Page[];
  totalCount?: number;
  page?: number;
  limit?: number;
}

/**
 * Single Page Response
 */
export interface PageResponse {
  page: Page;
}

/**
 * Page Versions Response
 */
export interface PageVersionsResponse {
  versions: ContentVersion[];
}

/**
 * Sections List Response
 */
export interface SectionsListResponse {
  sections: Section[];
}

/**
 * Single Section Response
 */
export interface SectionResponse {
  section: Section;
}

/**
 * Media List Response
 */
export interface MediaListResponse {
  media: Media[];
  totalCount: number;
  page?: number;
  limit?: number;
}

/**
 * Single Media Response
 */
export interface MediaResponse {
  media: Media;
}

/**
 * Media Upload Response
 */
export interface MediaUploadResponse {
  media: Media;
  message?: string;
}

/**
 * Templates List Response
 */
export interface TemplatesListResponse {
  templates: SectionTemplate[];
}

/**
 * Single Template Response
 */
export interface TemplateResponse {
  template: SectionTemplate;
}

/**
 * Navigation Response
 */
export interface NavigationResponse {
  navigation: NavigationMenu;
}

/**
 * Settings Response
 */
export interface SettingsResponse {
  settings: SiteSettings;
}

/**
 * Generic Success Response
 */
export interface SuccessResponse {
  success: boolean;
  message?: string;
}

/**
 * Error Response
 */
export interface ErrorResponse {
  error: {
    statusCode: number;
    name: string;
    message: string;
    details?: any;
  };
}

// ============================================================================
// API REQUEST TYPES
// ============================================================================

/**
 * Pages List Query Parameters
 */
export interface PagesListParams {
  status?: PageStatus;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

/**
 * Media List Query Parameters
 */
export interface MediaListParams {
  folder?: string;
  mimeType?: string;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

/**
 * Sections List Query Parameters
 */
export interface SectionsListParams {
  pageId?: string;
  type?: SectionType;
  enabled?: boolean;
}

/**
 * Page Create/Update Request
 */
export interface PageRequest {
  slug: string;
  title: string;
  description?: string;
  status?: PageStatus;
  scheduledAt?: string | Date;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  ogImage?: string;
  ogImageAlt?: string;
  structuredData?: Record<string, any>;
}

/**
 * Section Create/Update Request
 */
export interface SectionRequest {
  pageId: string;
  type: SectionType;
  name: string;
  order: number;
  enabled?: boolean;
  content: Record<string, any>;
  settings?: Record<string, any>;
}

/**
 * Section Reorder Request
 */
export interface SectionReorderRequest {
  sections: Array<{
    id: string;
    order: number;
  }>;
}

/**
 * Media Update Request
 */
export interface MediaUpdateRequest {
  altText?: string;
  caption?: string;
  folder?: string;
  tags?: string[];
}

/**
 * Navigation Update Request
 */
export interface NavigationUpdateRequest {
  name?: string;
  items?: MenuItem[];
  enabled?: boolean;
}

/**
 * Settings Update Request
 */
export interface SettingsUpdateRequest {
  siteName?: string;
  siteDescription?: string;
  logo?: string;
  favicon?: string;
  contactEmail?: string;
  contactPhone?: string;
  socialMedia?: SocialMedia;
  footerText?: string;
  copyrightText?: string;
  gtmId?: string;
  gaId?: string;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a value is a Page
 */
export function isPage(value: any): value is Page {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.slug === 'string' &&
    typeof value.title === 'string' &&
    typeof value.status === 'string' &&
    ['draft', 'published', 'scheduled', 'archived'].includes(value.status)
  );
}

/**
 * Type guard to check if a value is a Section
 */
export function isSection(value: any): value is Section {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.pageId === 'string' &&
    typeof value.type === 'string' &&
    typeof value.name === 'string' &&
    typeof value.order === 'number' &&
    typeof value.enabled === 'boolean' &&
    typeof value.content === 'object'
  );
}

/**
 * Type guard to check if a value is Media
 */
export function isMedia(value: any): value is Media {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.filename === 'string' &&
    typeof value.mimeType === 'string' &&
    typeof value.url === 'string' &&
    typeof value.size === 'number'
  );
}

/**
 * Type guard to check if a value is a NavigationMenu
 */
export function isNavigationMenu(value: any): value is NavigationMenu {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.location === 'string' &&
    ['header', 'footer', 'sidebar', 'mobile'].includes(value.location) &&
    typeof value.enabled === 'boolean'
  );
}

/**
 * Type guard to check if a value is SiteSettings
 */
export function isSiteSettings(value: any): value is SiteSettings {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.siteName === 'string'
  );
}

/**
 * Type guard to check if a value is a ContentVersion
 */
export function isContentVersion(value: any): value is ContentVersion {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.pageId === 'string' &&
    typeof value.version === 'number' &&
    typeof value.content === 'object'
  );
}

/**
 * Type guard to check if a value is a SectionTemplate
 */
export function isSectionTemplate(value: any): value is SectionTemplate {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.type === 'string' &&
    typeof value.defaultContent === 'object'
  );
}

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse(value: any): value is ErrorResponse {
  return (
    value &&
    typeof value === 'object' &&
    value.error &&
    typeof value.error === 'object' &&
    typeof value.error.statusCode === 'number' &&
    typeof value.error?.error?.message === 'string'
  );
}

/**
 * Type guard to check if a value is a valid PageStatus
 */
export function isPageStatus(value: any): value is PageStatus {
  return (
    typeof value === 'string' &&
    ['draft', 'published', 'scheduled', 'archived'].includes(value)
  );
}

/**
 * Type guard to check if a value is a valid SectionType
 */
export function isSectionType(value: any): value is SectionType {
  return (
    typeof value === 'string' &&
    [
      'premium-hero',
      'premium-product-showcase',
      'premium-fabric-details',
      'premium-statement',
      'premium-feature-grid',
      'premium-confidence',
      'premium-reserve-cta',
      'premium-countdown',
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
      'custom',
    ].includes(value)
  );
}

/**
 * Type guard to check if a value is a valid NavigationLocation
 */
export function isNavigationLocation(value: any): value is NavigationLocation {
  return (
    typeof value === 'string' &&
    ['header', 'footer', 'sidebar', 'mobile'].includes(value)
  );
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Partial Page for updates
 */
export type PartialPage = Partial<Page>;

/**
 * Partial Section for updates
 */
export type PartialSection = Partial<Section>;

/**
 * Partial Media for updates
 */
export type PartialMedia = Partial<Media>;

/**
 * Page with required sections
 */
export type PageWithSections = Page & {
  sections: Section[];
};

/**
 * Section with specific content type
 */
export type TypedSection<T = any> = Omit<Section, 'content'> & {
  content: T;
};

/**
 * Hero Section
 */
export type HeroSection = TypedSection<HeroSectionContent>;

/**
 * Features Section
 */
export type FeaturesSection = TypedSection<FeaturesSectionContent>;

/**
 * Testimonials Section
 */
export type TestimonialsSection = TypedSection<TestimonialsSectionContent>;

/**
 * Gallery Section
 */
export type GallerySection = TypedSection<GallerySectionContent>;

/**
 * CTA Section
 */
export type CTASection = TypedSection<CTASectionContent>;

/**
 * Text Section
 */
export type TextSection = TypedSection<TextSectionContent>;
