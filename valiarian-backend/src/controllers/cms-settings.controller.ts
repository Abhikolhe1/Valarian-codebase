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
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      settings = await this.siteSettingsRepository.create(defaultSettings);
    }

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
