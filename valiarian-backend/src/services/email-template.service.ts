import {injectable} from '@loopback/core';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import * as path from 'path';

@injectable()
export class EmailTemplateService {
  private templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();
  private templatesPath: string;

  constructor() {
    this.templatesPath = path.join(__dirname, '..', 'templates', 'emails');
  }

  /**
   * Load and compile an email template
   * @param templateName - Name of the template file (without .html extension)
   * @param data - Data to populate the template
   * @returns Compiled HTML string
   */
  async renderTemplate(templateName: string, data: any): Promise<string> {
    try {
      // Check if template is already cached
      let template = this.templateCache.get(templateName);

      if (!template) {
        // Load template from file
        const templatePath = path.join(this.templatesPath, `${templateName}.html`);
        const templateContent = fs.readFileSync(templatePath, 'utf-8');

        // Compile template
        template = Handlebars.compile(templateContent);

        // Cache the compiled template
        this.templateCache.set(templateName, template);
      }

      // Render template with data
      return template(data);
    } catch (error) {
      console.error(`Error rendering email template ${templateName}:`, error);
      throw new Error(`Failed to render email template: ${templateName}`);
    }
  }

  /**
   * Clear the template cache (useful for development)
   */
  clearCache(): void {
    this.templateCache.clear();
  }
}
