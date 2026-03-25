import {authenticate, AuthenticationBindings} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  HttpErrors,
  patch,
  requestBody,
  response
} from '@loopback/rest';
import {UserProfile} from '@loopback/security';
import {authorize} from '../authorization';
import {SiteSettings} from '../models';
import {SiteSettingsRepository} from '../repositories';

const defaultContactPage = {
  heroBadge: 'Where',
  heroTitleLine1: 'to',
  heroTitleLine2: 'find',
  heroTitleLine3: 'us?',
  heroImage: '/assets/images/contact/hero.jpg',
  formTitle: 'Feel free to contact us.',
  formDescription: "We'll be glad to hear from you, buddy.",
  submitLabel: 'Submit Now',
  mapTitle: 'Visit our office',
  mapDescription: 'Find us on the map or reach out directly using the form.',
  mapEmbedUrl: '',
  locations: [
    {
      title: 'Head Office',
      address: '508 Bridle Avenue Newnan, GA 30263',
      phoneNumber: '(239) 555-0108',
      latitude: 33,
      longitude: 65,
    },
    {
      title: 'Studio',
      address: '14 Fashion Street, London, UK',
      phoneNumber: '(319) 555-0115',
      latitude: -12.5,
      longitude: 18.5,
    },
  ],
};

export class CMSSettingsController {
  constructor(
    @repository(SiteSettingsRepository)
    public siteSettingsRepository: SiteSettingsRepository,
  ) { }

  @get('/api/cms/settings')
  @response(200, {
    description: 'SiteSettings singleton instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(SiteSettings),
      },
    },
  })
  async get(): Promise<SiteSettings> {
    let settings = await this.siteSettingsRepository.getSingleton();

    // If no settings exist, create default settings
    if (!settings) {
      const defaultSettings = {
        siteName: 'Valiarian',
        siteDescription: 'Welcome to Valiarian',
        logo: '/logo/logo_full.svg',
        favicon: '/favicon/favicon.ico',
        contactEmail: 'contact@valiarian.com',
        contactPhone: '',
        socialMedia: {
          facebook: '',
          instagram: '',
          twitter: '',
          linkedin: '',
          youtube: '',
          pinterest: ''
        },
        footerText: '',
        copyrightText: '© 2024 Valiarian. All rights reserved.',
        gtmId: '',
        gaId: '',
        contactPage: defaultContactPage,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      settings = await this.siteSettingsRepository.create(defaultSettings);
    }

    settings.contactPage = {
      ...defaultContactPage,
      ...(settings.contactPage || {}),
      locations:
        settings.contactPage?.locations?.length
          ? settings.contactPage.locations
          : defaultContactPage.locations,
    };

    return settings;
  }

  @authenticate('jwt')
  @authorize({roles: ['super_admin', 'admin']})
  @patch('/api/cms/settings')
  @response(200, {
    description: 'SiteSettings singleton instance updated',
    content: {
      'application/json': {
        schema: getModelSchemaRef(SiteSettings),
      },
    },
  })
  async update(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              siteName: {type: 'string', minLength: 1},
              siteDescription: {type: 'string'},
              logo: {type: 'string'},
              favicon: {type: 'string'},
              contactEmail: {type: 'string', format: 'email'},
              contactPhone: {type: 'string'},
              socialMedia: {
                type: 'object',
                properties: {
                  facebook: {type: 'string'},
                  instagram: {type: 'string'},
                  twitter: {type: 'string'},
                  linkedin: {type: 'string'},
                  youtube: {type: 'string'},
                  pinterest: {type: 'string'},
                },
              },
              footerText: {type: 'string'},
              copyrightText: {type: 'string'},
              gtmId: {type: 'string'},
              gaId: {type: 'string'},
              contactPage: {
                type: 'object',
                properties: {
                  heroBadge: {type: 'string'},
                  heroTitleLine1: {type: 'string'},
                  heroTitleLine2: {type: 'string'},
                  heroTitleLine3: {type: 'string'},
                  heroImage: {type: 'string'},
                  formTitle: {type: 'string'},
                  formDescription: {type: 'string'},
                  submitLabel: {type: 'string'},
                  mapTitle: {type: 'string'},
                  mapDescription: {type: 'string'},
                  mapEmbedUrl: {type: 'string'},
                  locations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: {type: 'string'},
                        address: {type: 'string'},
                        phoneNumber: {type: 'string'},
                        latitude: {type: 'number'},
                        longitude: {type: 'number'},
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })
    settingsData: Partial<SiteSettings>,
  ): Promise<SiteSettings> {
    try {
      return await this.siteSettingsRepository.updateSingleton(settingsData);
    } catch (error) {
      if (error instanceof Error && error.message === 'Site settings not found') {
        throw new HttpErrors.NotFound('Site settings not found');
      }
      throw error;
    }
  }
}
