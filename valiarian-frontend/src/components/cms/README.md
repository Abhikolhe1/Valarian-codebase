# CMS Components

This directory contains components for rendering CMS content on the frontend.

## Section Renderer

The `SectionRenderer` component is responsible for rendering individual CMS sections with error boundaries and loading states.

### Features

- **Type Mapping**: Automatically maps section types to their corresponding components
- **Error Boundaries**: Catches and displays errors gracefully without breaking the page
- **Loading Skeletons**: Shows appropriate loading states for different section types
- **Validation**: Validates section data and handles missing or invalid sections
- **Enabled/Disabled**: Respects the `enabled` flag on sections

### Usage

#### Rendering a Single Section

```jsx
import { SectionRenderer } from 'src/components/cms';

function MyPage() {
  const section = {
    id: '123',
    type: 'hero',
    name: 'Homepage Hero',
    enabled: true,
    content: {
      heading: 'Welcome to Valiarian',
      subheading: 'Premium Fashion',
      // ... other content
    },
  };

  return (
    <SectionRenderer
      section={section}
      isLoading={false}
      showErrorDetails={false}
      onError={(error, errorInfo, section) => {
        console.error('Section error:', error);
      }}
    />
  );
}
```

#### Rendering Multiple Sections

```jsx
import { SectionList } from 'src/components/cms';

function DynamicPage({ sections, isLoading }) {
  return (
    <SectionList
      sections={sections}
      isLoading={isLoading}
      showErrorDetails={process.env.NODE_ENV === 'development'}
      onError={(error, errorInfo, section) => {
        // Send to error tracking service
        console.error('Section error:', error);
      }}
    />
  );
}
```

#### With React Query

```jsx
import { usePageBySlug } from 'src/api/cms-query';
import { SectionList } from 'src/components/cms';

function DynamicPage({ slug }) {
  const { data, isLoading, error } = usePageBySlug(slug);

  if (error) {
    return <div>Error loading page</div>;
  }

  return (
    <SectionList
      sections={data?.page?.sections}
      isLoading={isLoading}
    />
  );
}
```

### Props

#### SectionRenderer

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `section` | `Section` | required | The section object to render |
| `isLoading` | `boolean` | `false` | Whether the section is loading |
| `showErrorDetails` | `boolean` | `false` | Whether to show detailed error messages |
| `onError` | `function` | - | Callback when an error occurs |
| `sx` | `object` | - | MUI sx prop for styling |

#### SectionList

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sections` | `Section[]` | `[]` | Array of sections to render |
| `isLoading` | `boolean` | `false` | Whether sections are loading |
| `showErrorDetails` | `boolean` | `false` | Whether to show detailed error messages |
| `onError` | `function` | - | Callback when an error occurs |
| `sx` | `object` | - | MUI sx prop for styling |

### Section Types

The following section types are supported:

- `hero` - Hero sections with background images/videos
- `features` - Feature grids/lists
- `testimonials` - Customer testimonials
- `gallery` - Image galleries
- `cta` - Call-to-action sections
- `text` - Rich text content
- `video` - Video sections
- `faq` - FAQ accordions
- `team` - Team member grids
- `pricing` - Pricing tables
- `contact` - Contact forms
- `custom` - Custom sections

### Loading Skeletons

Each section type has a custom loading skeleton that matches its layout:

```jsx
import { SectionSkeleton } from 'src/components/cms';

function LoadingState() {
  return (
    <>
      <SectionSkeleton type="hero" />
      <SectionSkeleton type="features" />
      <SectionSkeleton type="testimonials" />
    </>
  );
}
```

### Error Handling

The `SectionRenderer` includes an error boundary that catches rendering errors:

```jsx
<SectionRenderer
  section={section}
  showErrorDetails={process.env.NODE_ENV === 'development'}
  onError={(error, errorInfo, section) => {
    // Log to error tracking service
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          section: {
            id: section.id,
            type: section.type,
            name: section.name,
          },
        },
      });
    }
  }}
/>
```

### Adding New Section Components

To add a new section component:

1. Create the component in `src/sections/cms/` (will be done in task 21.2)
2. Import it in `SectionRenderer.js`
3. Add it to the `sectionComponents` map in `getSectionComponent()`

Example:

```jsx
// In SectionRenderer.js
import HeroSection from '../../../sections/cms/HeroSection';

function getSectionComponent(type) {
  const sectionComponents = {
    hero: HeroSection,
    // ... other components
  };

  return sectionComponents[type] || null;
}
```

### Best Practices

1. **Always use error boundaries**: The `SectionRenderer` includes error boundaries by default
2. **Show loading states**: Use `isLoading` prop to show skeletons while data is loading
3. **Handle disabled sections**: Sections with `enabled: false` are automatically hidden
4. **Sort sections**: The `SectionList` automatically sorts sections by their `order` field
5. **Error tracking**: Use the `onError` callback to send errors to your tracking service
6. **Development vs Production**: Show detailed errors in development, hide them in production

### Performance Considerations

- Section components will be lazy-loaded in the future to reduce initial bundle size
- Loading skeletons prevent layout shift during content loading
- Error boundaries prevent one broken section from breaking the entire page
- Disabled sections are not rendered at all (no DOM nodes created)

## Future Enhancements

- Lazy loading of section components
- Section animations and transitions
- Section preview mode
- A/B testing support
- Personalization based on user data
