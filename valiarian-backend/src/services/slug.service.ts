import {injectable} from '@loopback/core';
import {ProductRepository} from '../repositories';

@injectable()
export class SlugService {
  /**
   * Generate a URL-friendly slug from text
   * @param text - The text to convert to a slug
   * @returns URL-friendly slug
   */
  generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric characters with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Generate a unique slug by checking against existing slugs in the repository
   * @param text - The text to convert to a slug
   * @param repository - The repository to check for existing slugs
   * @param excludeId - Optional ID to exclude from uniqueness check (for updates)
   * @returns Unique URL-friendly slug
   */
  async generateUniqueSlug(
    text: string,
    repository: ProductRepository,
    excludeId?: string,
  ): Promise<string> {
    let slug = this.generateSlug(text);

    // Check if slug exists
    let counter = 1;
    let uniqueSlug = slug;

    while (await this.slugExists(uniqueSlug, repository, excludeId)) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }

  /**
   * Check if a slug exists in the repository
   * @param slug - The slug to check
   * @param repository - The repository to check against
   * @param excludeId - Optional ID to exclude from check
   * @returns True if slug exists, false otherwise
   */
  private async slugExists(
    slug: string,
    repository: ProductRepository,
    excludeId?: string,
  ): Promise<boolean> {
    return repository.slugExists(slug, excludeId);
  }
}
