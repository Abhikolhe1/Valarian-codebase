/**
 * CMS Section Components - Usage Examples
 *
 * This file demonstrates how to use each section component with sample data.
 * These examples can be used for testing, documentation, or as templates.
 */

// Example data for each section type

export const heroSectionExample = {
  id: 'hero-1',
  type: 'hero',
  name: 'Homepage Hero',
  order: 1,
  enabled: true,
  content: {
    backgroundImage: '/assets/images/home/hero.jpg',
    overlayOpacity: 0.5,
    heading: 'Welcome to Valiarian',
    subheading: 'Premium Fashion',
    description: 'Discover our exclusive collection of premium clothing and accessories',
    ctaButtons: [
      {
        text: 'Shop Now',
        url: '/shop',
        style: 'primary',
        icon: 'eva:shopping-cart-fill',
        openInNewTab: false,
      },
      {
        text: 'Learn More',
        url: '/about',
        style: 'outline',
        openInNewTab: false,
      },
    ],
    alignment: 'center',
    height: 'full',
  },
};

export const featuresSectionExample = {
  id: 'features-1',
  type: 'features',
  name: 'Key Features',
  order: 2,
  enabled: true,
  content: {
    heading: 'Why Choose Valiarian',
    description: 'Discover what makes us the premier choice for premium fashion',
    features: [
      {
        icon: 'eva:star-fill',
        title: 'Premium Quality',
        description: 'Only the finest materials and craftsmanship in every piece',
        link: '/quality',
      },
      {
        icon: 'eva:shield-fill',
        title: 'Secure Shopping',
        description: 'Your data and transactions are always protected',
      },
      {
        icon: 'eva:flash-fill',
        title: 'Fast Delivery',
        description: 'Express shipping available to all major cities',
      },
      {
        icon: 'eva:heart-fill',
        title: 'Customer Care',
        description: '24/7 support from our dedicated team',
      },
      {
        icon: 'eva:refresh-fill',
        title: 'Easy Returns',
        description: '30-day hassle-free return policy',
      },
      {
        icon: 'eva:award-fill',
        title: 'Exclusive Designs',
        description: 'Limited edition pieces you won\'t find anywhere else',
      },
    ],
    layout: 'grid',
    columns: 3,
  },
};

export const testimonialsSectionExample = {
  id: 'testimonials-1',
  type: 'testimonials',
  name: 'Customer Reviews',
  order: 3,
  enabled: true,
  content: {
    heading: 'What Our Customers Say',
    testimonials: [
      {
        name: 'Sarah Johnson',
        role: 'Fashion Blogger',
        company: 'Style Maven',
        avatar: '/assets/images/avatars/avatar_1.jpg',
        content: 'Valiarian has completely transformed my wardrobe. The quality is exceptional and the designs are timeless. I receive compliments every time I wear their pieces!',
        rating: 5,
      },
      {
        name: 'Michael Chen',
        role: 'CEO',
        company: 'Tech Innovations',
        avatar: '/assets/images/avatars/avatar_2.jpg',
        content: 'As someone who values both style and quality, Valiarian delivers on both fronts. Their customer service is outstanding and shipping is always prompt.',
        rating: 5,
      },
      {
        name: 'Emily Rodriguez',
        role: 'Interior Designer',
        company: 'Design Studio',
        avatar: '/assets/images/avatars/avatar_3.jpg',
        content: 'I\'ve been a loyal customer for over two years. The attention to detail in every piece is remarkable. Valiarian truly understands premium fashion.',
        rating: 5,
      },
    ],
    layout: 'grid',
    showRatings: true,
  },
};

export const gallerySectionExample = {
  id: 'gallery-1',
  type: 'gallery',
  name: 'Product Gallery',
  order: 4,
  enabled: true,
  content: {
    heading: 'Our Latest Collection',
    images: [
      '/assets/images/products/product_1.jpg',
      '/assets/images/products/product_2.jpg',
      '/assets/images/products/product_3.jpg',
      '/assets/images/products/product_4.jpg',
      '/assets/images/products/product_5.jpg',
      '/assets/images/products/product_6.jpg',
    ],
    layout: 'grid',
    columns: 3,
    aspectRatio: '4/5',
  },
};

export const ctaSectionExample = {
  id: 'cta-1',
  type: 'cta',
  name: 'Newsletter Signup',
  order: 5,
  enabled: true,
  content: {
    heading: 'Join Our Exclusive Community',
    description: 'Be the first to know about new collections, special offers, and fashion tips',
    backgroundImage: '/assets/images/home/cta-bg.jpg',
    buttons: [
      {
        text: 'Subscribe Now',
        url: '/newsletter',
        style: 'primary',
        icon: 'eva:email-fill',
        openInNewTab: false,
      },
      {
        text: 'Learn More',
        url: '/about',
        style: 'outline',
        openInNewTab: false,
      },
    ],
    alignment: 'center',
  },
};

export const textSectionExample = {
  id: 'text-1',
  type: 'text',
  name: 'About Us',
  order: 6,
  enabled: true,
  content: {
    heading: 'Our Story',
    content: `
# Welcome to Valiarian

Founded in 2020, Valiarian has quickly become a leading name in premium fashion. Our mission is to provide exceptional quality clothing that combines timeless elegance with modern design.

## Our Philosophy

We believe that fashion should be:

- **Sustainable** - We use eco-friendly materials and ethical manufacturing practices
- **Timeless** - Our designs transcend seasonal trends
- **Accessible** - Premium quality shouldn't be out of reach

## What Sets Us Apart

At Valiarian, we're committed to excellence in every aspect of our business. From the initial design concept to the final product, we maintain the highest standards of quality and craftsmanship.

> "Fashion is not something that exists in dresses only. Fashion is in the sky, in the street, fashion has to do with ideas, the way we live, what is happening." - Coco Chanel

### Our Promise

When you choose Valiarian, you're not just buying clothing - you're investing in pieces that will remain stylish and relevant for years to come.

[Explore Our Collection](/shop)
    `,
    alignment: 'left',
  },
};

// All examples combined for easy testing
export const allSectionExamples = [
  heroSectionExample,
  featuresSectionExample,
  testimonialsSectionExample,
  gallerySectionExample,
  ctaSectionExample,
  textSectionExample,
];

// Example of a complete page with multiple sections
export const examplePage = {
  id: 'page-1',
  slug: 'home',
  title: 'Home',
  description: 'Welcome to Valiarian - Premium Fashion',
  status: 'published',
  sections: allSectionExamples,
};

// Example usage in a component:
/*
import { SectionList } from 'src/components/cms';
import { allSectionExamples } from 'src/sections/cms/SectionExamples';

function ExamplePage() {
  return <SectionList sections={allSectionExamples} />;
}
*/
