# CMS Section Components

This directory contains the section type components that render different types of CMS content sections.

## Overview

Each section component is responsible for rendering a specific type of content section with its own layout, styling, and interactions. All components follow a consistent pattern and use Material-UI components with Framer Motion animations.

## Available Section Components

### 1. HeroSection

Hero sections with full-screen or custom height backgrounds, headings, and call-to-action buttons.

**Features:**
- Background image or video support
- Configurable overlay opacity
- Heading, subheading, and description
- Multiple CTA buttons with different styles
- Alignment options (left, center, right)
- Height options (full, auto, custom)

**Content Structure:**
```javascript
{
  backgroundImage: 'https://example.com/hero.jpg',
  backgroundVideo: 'https://example.com/hero.mp4',
  overlayOpacity: 0.5,
  heading: 'Welcome to Valiarian',
  subheading: 'Premium Fashion',
  description: 'Discover our latest collection',
  ctaButtons: [
    {
      text: 'Shop Now',
      url: '/shop',
      style: 'primary',
      icon: 'eva:shopping-cart-fill',
      openInNewTab: false
    }
  ],
  alignment: 'center',
  height: 'full'
}
```

### 2. FeaturesSection

Feature grids, lists, or carousels showcasing product features or benefits.

**Features:**
- Three layout options: grid, list, carousel
- Configurable number of columns
- Icon support (image URL or icon name)
- Optional links for each feature
- Hover effects and animations

**Content Structure:**
```javascript
{
  heading: 'Why Choose Us',
  description: 'Discover what makes us special',
  features: [
    {
      icon: 'eva:star-fill',
      title: 'Premium Quality',
      description: 'Only the finest materials',
      link: '/quality'
    }
  ],
  layout: 'grid',
  columns: 3
}
```

### 3. TestimonialsSection

Customer testimonials with ratings and author information.

**Features:**
- Three layout options: grid, carousel, masonry
- Star ratings display
- Author avatar, name, role, and company
- Quote styling with icons
- Responsive layouts

**Content Structure:**
```javascript
{
  heading: 'What Our Customers Say',
  testimonials: [
    {
      name: 'John Doe',
      role: 'CEO',
      company: 'Tech Corp',
      avatar: 'https://example.com/avatar.jpg',
      content: 'Amazing product and service!',
      rating: 5
    }
  ],
  layout: 'grid',
  showRatings: true
}
```

### 4. GallerySection

Image galleries with lightbox functionality.

**Features:**
- Three layout options: grid, masonry, carousel
- Configurable columns and aspect ratio
- Lightbox for full-screen image viewing
- Hover effects with zoom
- Navigation arrows for carousel

**Content Structure:**
```javascript
{
  heading: 'Our Gallery',
  images: [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg'
  ],
  layout: 'grid',
  columns: 3,
  aspectRatio: '1/1'
}
```

### 5. CTASection

Call-to-action sections with background images and multiple buttons.

**Features:**
- Background image or solid color
- Heading and description
- Multiple CTA buttons
- Alignment options
- Overlay for better text readability

**Content Structure:**
```javascript
{
  heading: 'Ready to Get Started?',
  description: 'Join thousands of satisfied customers',
  backgroundImage: 'https://example.com/cta-bg.jpg',
  backgroundColor: '#1976d2',
  buttons: [
    {
      text: 'Get Started',
      url: '/signup',
      style: 'primary',
      icon: 'eva:arrow-forward-fill',
      openInNewTab: false
    }
  ],
  alignment: 'center'
}
```

### 6. TextSection

Rich text content sections with markdown support.

**Features:**
- Markdown rendering
- Heading support
- Alignment options
- Styled typography for all markdown elements
- Code block syntax highlighting
- Blockquote styling

**Content Structure:**
```javascript
{
  heading: 'About Our Company',
  content: '# Welcome\n\nThis is **bold** and this is *italic*.',
  alignment: 'left'
}
```

## Common Patterns

### Props Structure

All section components receive a `section` prop with the following structure:

```javascript
{
  id: 'section-123',
  type: 'hero',
  name: 'Homepage Hero',
  order: 1,
  enabled: true,
  content: {
    // Section-specific content
  },
  settings: {
    // Optional section-specific settings
  }
}
```

### Animations

All sections use Framer Motion for animations:
- `varFade().inUp` - Fade in from bottom
- `varFade().inDown` - Fade in from top
- `MotionViewport` - Trigger animations when section enters viewport

### Responsive Design

All sections are fully responsive with breakpoints:
- `xs` - Mobile (< 600px)
- `sm` - Tablet (600px - 900px)
- `md` - Desktop (900px - 1200px)
- `lg` - Large Desktop (> 1200px)

### Styling

All sections use Material-UI's `sx` prop for styling:
- Theme-aware colors
- Consistent spacing
- Responsive values
- Dark mode support

## Usage Examples

### Basic Usage

```jsx
import { HeroSection } from 'src/sections/cms';

function MyPage() {
  const section = {
    id: '1',
    type: 'hero',
    name: 'Hero',
    enabled: true,
    content: {
      heading: 'Welcome',
      // ... other content
    }
  };

  return <HeroSection section={section} />;
}
```

### With SectionRenderer

```jsx
import { SectionRenderer } from 'src/components/cms';

function DynamicPage({ sections }) {
  return (
    <>
      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </>
  );
}
```

### With React Query

```jsx
import { usePageBySlug } from 'src/api/cms-query';
import { SectionList } from 'src/components/cms';

function DynamicPage({ slug }) {
  const { data, isLoading } = usePageBySlug(slug);

  return (
    <SectionList
      sections={data?.page?.sections}
      isLoading={isLoading}
    />
  );
}
```

## Content Validation

All section components validate their content props using PropTypes. Invalid content will trigger console warnings in development mode.

## Accessibility

All sections follow accessibility best practices:
- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Focus management
- Alt text for images
- Proper heading hierarchy

## Performance

- Components use React.memo where appropriate
- Images use lazy loading
- Animations are GPU-accelerated
- Carousels use virtualization for large datasets

## Customization

### Extending Sections

To add custom styling to a section:

```jsx
<HeroSection
  section={section}
  sx={{
    bgcolor: 'primary.main',
    color: 'white',
  }}
/>
```

### Adding New Section Types

1. Create a new component in this directory
2. Export it from `index.js`
3. Add it to the `getSectionComponent` function in `SectionRenderer.js`
4. Update the TypeScript types in `src/types/cms.ts`

## Testing

Each section component should be tested for:
- Rendering with valid content
- Handling missing optional fields
- Responsive behavior
- Accessibility compliance
- Animation triggers

## Future Enhancements

- Lazy loading of section components
- Section-specific loading skeletons
- A/B testing support
- Personalization based on user data
- Section preview mode
- Drag-and-drop reordering in admin panel

## Related Documentation

- [SectionRenderer Documentation](../../components/cms/README.md)
- [CMS API Documentation](../../api/README-REACT-QUERY.md)
- [CMS Types](../../types/cms.ts)
