import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {get, put, requestBody} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {authorize} from '../authorization';
import {AboutPage} from '../models';
import {AboutPageRepository} from '../repositories';

const DEFAULT_ABOUT_PAGE: Partial<AboutPage> = {
  slug: 'about-us',
  isActive: true,
  hero: {
    eyebrow: 'Our Story',
    title: 'A commitment to timeless quality, sustainable craftsmanship, and the perfect polo shirt.',
    backgroundImage: '/assets/images/about/hero.jpg',
    overlayImage: '/assets/background/overlay_1.svg',
  },
  stories: [
    {
      id: 'story-1',
      title: 'Where It All Began',
      description:
        'Founded in 2018, Premium Cotton Polo was born from a simple observation: despite the popularity of polo shirts, it was difficult to find one that truly balanced comfort, quality, and timeless style.',
      image: '/assets/images/home/fabric/fabric1.webp',
      video: '/assets/images/home/fabric/fabric1.mp4',
    },
    {
      id: 'story-2',
      title: 'Our Commitment to Quality',
      description:
        'Every polo is made from long-staple premium cotton, sourced from certified suppliers who share our values.',
      image: '/assets/images/home/fabric/fabric2.jpg',
      video: '/assets/images/home/fabric/fabric2.mp4',
    },
  ],
  thoughts: {
    items: [
      {
        id: 'thought-1',
        quote:
          '"We believe that the best clothes are the ones you forget you\'re wearing, those that fit so perfectly, feel so comfortable, and look so good that they become second nature."',
        author: 'The Premium Cotton Co Team',
      },
    ],
  },
  values: {
    heading: 'Our Values',
    items: [
      {
        id: 'value-1',
        icon: 'mdi:medal-outline',
        title: 'Craftsmanship',
        description:
          'Every detail matters. From the selection of premium cotton to the final stitch, we never compromise on quality.',
      },
      {
        id: 'value-2',
        icon: 'mdi:sync',
        title: 'Sustainability',
        description:
          'We are committed to ethical production, sustainable materials, and creating garments designed to last.',
      },
    ],
  },
  team: {
    heading: 'Great team is the key',
    description:
      'Valiarian will provide you support if you have any problems, our support team will reply within a day and we also have detailed documentation.',
    ctaText: 'All Members',
    members: [],
  },
  seo: {
    title: 'About Us | Valiarian',
    description: 'Learn more about Valiarian, our story, values, and team.',
  },
};

export class AboutPageController {
  constructor(
    @repository(AboutPageRepository)
    public aboutPageRepository: AboutPageRepository,
  ) {}

  private async findOrCreateAboutPage() {
    let aboutPage = await this.aboutPageRepository.findOne({
      where: {slug: 'about-us'},
    });

    if (!aboutPage) {
      aboutPage = await this.aboutPageRepository.create(DEFAULT_ABOUT_PAGE);
    }

    return aboutPage;
  }

  @get('/api/about-page')
  async getPublicAboutPage(): Promise<AboutPage> {
    return this.findOrCreateAboutPage();
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  @get('/api/cms/about-page')
  async getAdminAboutPage(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
  ): Promise<AboutPage> {
    void currentUser;
    return this.findOrCreateAboutPage();
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  @put('/api/cms/about-page')
  async upsertAboutPage(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
          },
        },
      },
    })
    body: Partial<AboutPage>,
  ): Promise<AboutPage> {
    void currentUser;

    const existing = await this.findOrCreateAboutPage();

    await this.aboutPageRepository.updateById(existing.id, {
      ...body,
      slug: 'about-us',
      updatedAt: new Date(),
    });

    return this.aboutPageRepository.findById(existing.id);
  }
}
