import { useMemo } from 'react';
import { useNavigation } from 'src/api/cms-query';
import { paths } from 'src/routes/paths';

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
          { name: 'Products', href: paths.about },
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
        children: [{ name: 'support@valiarian.in', href: '#' }],
      },
    ],
    []
  );

  // Transform CMS navigation data to footer format
  const cmsNavigation = useMemo(() => {
    if (!navigationData || !navigationData.items) {
      return null;
    }

    // Group items by parent (top-level items become headlines)
    const grouped = [];
    const topLevelItems = navigationData.items
      .filter((item) => !item.parentId)
      .sort((a, b) => a.order - b.order);

    topLevelItems.forEach((parent) => {
      const children = navigationData.items
        .filter((item) => item.parentId === parent.id)
        .sort((a, b) => a.order - b.order)
        .map((child) => ({
          name: child.label,
          href: child.url,
        }));

      grouped.push({
        headline: parent.label,
        children: children.length > 0 ? children : [{ name: parent.label, href: parent.url }],
      });
    });

    return grouped;
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
