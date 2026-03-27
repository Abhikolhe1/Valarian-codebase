import { useMemo } from 'react';
import { useNavigation } from 'src/api/cms-query';
import { paths } from 'src/routes/paths';
import { transformFooterNavigation } from 'src/utils/navigation';

/**
 * Hook to fetch and transform footer navigation from CMS
 * Falls back to default navigation if CMS data is unavailable
 */
export function useFooterNavigation() {
  const { data: navigationData, isLoading, error } = useNavigation('footer');

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
          { name: 'Terms and Condition', href: '#' },
          { name: 'Privacy Policy', href: '#' },
        ],
      },
      {
        headline: 'Contact',
        children: [{ name: 'support@valiarian.in', href: '#' },
          { name: 'Contact Us', href: paths.contact}
        ],
      },
    ],
    []
  );

  // Transform CMS navigation data to footer format
  const cmsNavigation = useMemo(() => {
    if (!navigationData || !navigationData.items || navigationData.items.length === 0) {
      return null;
    }

    return transformFooterNavigation(navigationData);
  }, [navigationData]);

  // Return CMS navigation if available, otherwise fallback
  const navigation = cmsNavigation || defaultNavigation;

  return {
    navigation,
    isLoading,
    error,
    isFromCMS: !!cmsNavigation,
  };
}
