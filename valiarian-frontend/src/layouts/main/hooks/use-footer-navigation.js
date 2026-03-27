import { useCallback, useMemo } from 'react';
import { useNavigation } from 'src/api/cms-query';
import { useSiteSettings } from 'src/contexts/SiteSettingsContext';
import { paths } from 'src/routes/paths';
import { transformFooterNavigation } from 'src/utils/navigation';

/**
 * Hook to fetch and transform footer navigation from CMS
 * Falls back to default navigation if CMS data is unavailable
 */
export function useFooterNavigation() {
  const { data: navigationData, isLoading, error } = useNavigation('footer');
  const { settings } = useSiteSettings();
  const legalDocuments = settings?.legalDocuments || {};

  const normalizeDocumentHref = useCallback((href) => {
    if (!href || typeof href !== 'string') {
      return '';
    }

    const trimmedHref = href.trim();

    if (!trimmedHref) {
      return '';
    }

    if (
      trimmedHref.startsWith('http://') ||
      trimmedHref.startsWith('https://') ||
      trimmedHref.startsWith('/')
    ) {
      return trimmedHref;
    }

    return `/${trimmedHref}`;
  }, []);

  const buildLegalLink = useCallback(
    (name, href) => ({
      name,
      href: normalizeDocumentHref(href) || '#',
      target: normalizeDocumentHref(href) ? '_blank' : undefined,
      rel: normalizeDocumentHref(href) ? 'noopener noreferrer' : undefined,
    }),
    [normalizeDocumentHref]
  );

  // Default fallback navigation
  const defaultNavigation = useMemo(
    () => [
      {
        headline: 'Valiarian',
        children: [
          { name: 'Products', href: paths.product.root },
          { name: 'Our Story', href: paths.contact },
          { name: 'FAQs', href: paths.faqs },
        ],
      },
      {
        headline: 'Legal',
        children: [
          {
            name: 'Terms and Condition',
            href: legalDocuments.termsAndConditionsUrl || '#',
            target: legalDocuments.termsAndConditionsUrl ? '_blank' : undefined,
            rel: legalDocuments.termsAndConditionsUrl ? 'noopener noreferrer' : undefined,
          },
          {
            name: 'Privacy Policy',
            href: legalDocuments.privacyPolicyUrl || '#',
            target: legalDocuments.privacyPolicyUrl ? '_blank' : undefined,
            rel: legalDocuments.privacyPolicyUrl ? 'noopener noreferrer' : undefined,
          },
        ],
      },
      {
        headline: 'Contact',
        children: [{ name: 'support@valiarian.in', href: '#' },
          { name: 'Contact Us', href: paths.contact}
        ],
      },
    ],
    [legalDocuments.privacyPolicyUrl, legalDocuments.termsAndConditionsUrl]
  );

  // Transform CMS navigation data to footer format
  const cmsNavigation = useMemo(() => {
    if (!navigationData || !navigationData.items || navigationData.items.length === 0) {
      return null;
    }

    const transformedNavigation = transformFooterNavigation(navigationData);
    const legalLinks = [
      buildLegalLink('Terms and Condition', legalDocuments.termsAndConditionsUrl),
      buildLegalLink('Privacy Policy', legalDocuments.privacyPolicyUrl),
    ];
    const legalHeadlineIndex = transformedNavigation.findIndex(
      (section) => section.headline?.toLowerCase() === 'legal'
    );

    if (legalHeadlineIndex === -1) {
      return [
        ...transformedNavigation,
        {
          headline: 'Legal',
          children: legalLinks,
        },
      ];
    }

    const updatedNavigation = [...transformedNavigation];
    updatedNavigation[legalHeadlineIndex] = {
      ...updatedNavigation[legalHeadlineIndex],
      children: legalLinks,
    };

    return updatedNavigation;
  }, [
    buildLegalLink,
    legalDocuments.privacyPolicyUrl,
    legalDocuments.termsAndConditionsUrl,
    navigationData,
  ]);

  // Return CMS navigation if available, otherwise fallback
  const navigation = cmsNavigation || defaultNavigation;

  return {
    navigation,
    isLoading,
    error,
    isFromCMS: !!cmsNavigation,
  };
}
