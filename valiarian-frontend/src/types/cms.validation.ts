/**
 * CMS Type Guards Validation Examples
 * Manual validation examples for runtime type validation functions
 *
 * To run these validations, import this file in your application
 * and call validateTypeGuards() during development
 */

import {
  isContentVersion,
  isErrorResponse,
  isMedia,
  isNavigationLocation,
  isNavigationMenu,
  isPage,
  isPageStatus,
  isSection,
  isSectionTemplate,
  isSectionType,
  isSiteSettings,
  type ContentVersion,
  type Media,
  type NavigationMenu,
  type Page,
  type Section,
  type SectionTemplate,
  type SiteSettings,
} from './cms';

/**
 * Validation helper
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ ${message}`);
}

/**
 * Run all type guard validations
 */
export function validateTypeGuards(): void {
  console.log('🧪 Starting CMS Type Guards Validation...\n');

  // Test isPage
  console.log('Testing isPage...');
  const validPage: Page = {
    id: '123',
    slug: 'test-page',
    title: 'Test Page',
    status: 'published',
    version: 1,
  };
  assert(isPage(validPage), 'isPage should return true for valid Page');
  assert(!isPage(null), 'isPage should return false for null');
  assert(!isPage({}), 'isPage should return false for empty object');
  assert(
    !isPage({id: '123', slug: 'test', title: 'Test', status: 'invalid'}),
    'isPage should return false for invalid status'
  );

  // Test isSection
  console.log('\nTesting isSection...');
  const validSection: Section = {
    id: '456',
    pageId: '123',
    type: 'hero',
    name: 'Hero Section',
    order: 0,
    enabled: true,
    content: {heading: 'Welcome'},
  };
  assert(isSection(validSection), 'isSection should return true for valid Section');
  assert(!isSection(null), 'isSection should return false for null');
  assert(!isSection({}), 'isSection should return false for empty object');

  // Test isMedia
  console.log('\nTesting isMedia...');
  const validMedia: Media = {
    id: '789',
    filename: 'image.jpg',
    originalName: 'image.jpg',
    mimeType: 'image/jpeg',
    size: 1024,
    url: 'https://example.com/image.jpg',
    folder: '/',
  };
  assert(isMedia(validMedia), 'isMedia should return true for valid Media');
  assert(!isMedia(null), 'isMedia should return false for null');
  assert(!isMedia({}), 'isMedia should return false for empty object');

  // Test isNavigationMenu
  console.log('\nTesting isNavigationMenu...');
  const validNav: NavigationMenu = {
    id: '101',
    name: 'Main Menu',
    location: 'header',
    enabled: true,
    items: [],
  };
  assert(isNavigationMenu(validNav), 'isNavigationMenu should return true for valid NavigationMenu');
  assert(!isNavigationMenu(null), 'isNavigationMenu should return false for null');
  assert(
    !isNavigationMenu({id: '101', name: 'Menu', location: 'invalid'}),
    'isNavigationMenu should return false for invalid location'
  );

  // Test isSiteSettings
  console.log('\nTesting isSiteSettings...');
  const validSettings: SiteSettings = {
    id: '202',
    siteName: 'My Site',
  };
  assert(isSiteSettings(validSettings), 'isSiteSettings should return true for valid SiteSettings');
  assert(!isSiteSettings(null), 'isSiteSettings should return false for null');
  assert(!isSiteSettings({id: '202'}), 'isSiteSettings should return false without siteName');

  // Test isContentVersion
  console.log('\nTesting isContentVersion...');
  const validVersion: ContentVersion = {
    id: '303',
    pageId: '123',
    version: 1,
    content: {title: 'Test'},
  };
  assert(isContentVersion(validVersion), 'isContentVersion should return true for valid ContentVersion');
  assert(!isContentVersion(null), 'isContentVersion should return false for null');

  // Test isSectionTemplate
  console.log('\nTesting isSectionTemplate...');
  const validTemplate: SectionTemplate = {
    id: '404',
    name: 'Hero Template',
    type: 'hero',
    defaultContent: {heading: 'Default'},
  };
  assert(isSectionTemplate(validTemplate), 'isSectionTemplate should return true for valid SectionTemplate');
  assert(!isSectionTemplate(null), 'isSectionTemplate should return false for null');

  // Test isErrorResponse
  console.log('\nTesting isErrorResponse...');
  const validError = {
    error: {
      statusCode: 404,
      name: 'NotFoundError',
      message: 'Page not found',
    },
  };
  assert(isErrorResponse(validError), 'isErrorResponse should return true for valid ErrorResponse');
  assert(!isErrorResponse(null), 'isErrorResponse should return false for null');
  assert(!isErrorResponse({error: 'string'}), 'isErrorResponse should return false for string error');

  // Test isPageStatus
  console.log('\nTesting isPageStatus...');
  assert(isPageStatus('draft'), 'isPageStatus should return true for "draft"');
  assert(isPageStatus('published'), 'isPageStatus should return true for "published"');
  assert(isPageStatus('scheduled'), 'isPageStatus should return true for "scheduled"');
  assert(isPageStatus('archived'), 'isPageStatus should return true for "archived"');
  assert(!isPageStatus('invalid'), 'isPageStatus should return false for invalid status');

  // Test isSectionType
  console.log('\nTesting isSectionType...');
  assert(isSectionType('hero'), 'isSectionType should return true for "hero"');
  assert(isSectionType('features'), 'isSectionType should return true for "features"');
  assert(isSectionType('testimonials'), 'isSectionType should return true for "testimonials"');
  assert(!isSectionType('invalid'), 'isSectionType should return false for invalid type');

  // Test isNavigationLocation
  console.log('\nTesting isNavigationLocation...');
  assert(isNavigationLocation('header'), 'isNavigationLocation should return true for "header"');
  assert(isNavigationLocation('footer'), 'isNavigationLocation should return true for "footer"');
  assert(isNavigationLocation('sidebar'), 'isNavigationLocation should return true for "sidebar"');
  assert(isNavigationLocation('mobile'), 'isNavigationLocation should return true for "mobile"');
  assert(!isNavigationLocation('invalid'), 'isNavigationLocation should return false for invalid location');

  // Test type narrowing
  console.log('\nTesting type narrowing...');
  const data: unknown = {
    id: '123',
    slug: 'test',
    title: 'Test',
    status: 'published',
  };
  if (isPage(data)) {
    assert(data.slug === 'test', 'Type narrowing should work for Page');
  }

  const response: unknown = {
    error: {
      statusCode: 500,
      name: 'InternalServerError',
      message: 'Something went wrong',
    },
  };
  if (isErrorResponse(response)) {
    assert(response.error.statusCode === 500, 'Type narrowing should work for ErrorResponse');
  }

  console.log('\n✨ All type guard validations passed!');
}

// Export for use in development
if (process.env.NODE_ENV === 'development') {
  // Uncomment to run validations on import
  // validateTypeGuards();
}
