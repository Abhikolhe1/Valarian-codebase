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

const defaultLegalDocuments = {
  termsAndConditionsUrl: '',
  privacyPolicyUrl: '',
};

const defaultThemeSettings = {
  primary: {
    lighter: '#C8FAD6',
    light: '#5BE49B',
    main: '#00A76F',
    dark: '#007867',
    darker: '#004B50',
    contrastText: '#FFFFFF',
  },
  secondary: {
    lighter: '#EFD6FF',
    light: '#C684FF',
    main: '#8E33FF',
    dark: '#5119B7',
    darker: '#27097A',
    contrastText: '#FFFFFF',
  },
};

const defaultOffersSettings = {
  marquee: [
    {text: 'Flat 20% off on premium polos'},
    {text: 'Free shipping on orders above ₹1999'},
    {text: 'Limited edition drop - Shop now'},
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
        legalDocuments: defaultLegalDocuments,
        theme: defaultThemeSettings,
        offers: defaultOffersSettings,
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
    settings.legalDocuments = {
      ...defaultLegalDocuments,
      ...(settings.legalDocuments || {}),
    };
    settings.theme = {
      ...defaultThemeSettings,
      ...(settings.theme || {}),
      primary: {
        ...defaultThemeSettings.primary,
        ...(settings.theme?.primary || {}),
      },
      secondary: {
        ...defaultThemeSettings.secondary,
        ...(settings.theme?.secondary || {}),
      },
    };
    settings.offers = {
      ...defaultOffersSettings,
      ...(settings.offers || {}),
      marquee:
        settings.offers?.marquee?.length
          ? settings.offers.marquee.filter(item => item?.text?.trim())
          : defaultOffersSettings.marquee,
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
              legalDocuments: {
                type: 'object',
                properties: {
                  termsAndConditionsUrl: {type: 'string'},
                  privacyPolicyUrl: {type: 'string'},
                },
              },
              theme: {
                type: 'object',
                properties: {
                  primary: {
                    type: 'object',
                    properties: {
                      lighter: {type: 'string'},
                      light: {type: 'string'},
                      main: {type: 'string'},
                      dark: {type: 'string'},
                      darker: {type: 'string'},
                      contrastText: {type: 'string'},
                    },
                  },
                  secondary: {
                    type: 'object',
                    properties: {
                      lighter: {type: 'string'},
                      light: {type: 'string'},
                      main: {type: 'string'},
                      dark: {type: 'string'},
                      darker: {type: 'string'},
                      contrastText: {type: 'string'},
                    },
                  },
                },
              },
              offers: {
                type: 'object',
                properties: {
                  marquee: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        text: {type: 'string'},
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
