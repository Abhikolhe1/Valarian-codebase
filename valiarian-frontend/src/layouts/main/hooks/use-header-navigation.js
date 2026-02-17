import { useMemo } from 'react';
import { useNavigation } from 'src/api/cms-query';
import Iconify from 'src/components/iconify';
import { paths } from 'src/routes/paths';
import { transformNavigationItems } from 'src/utils/navigation';

/**
 * Hook to fetch and transform header navigation from CMS
 * Falls back to default navigation if CMS data is unavailable
 */
export function useHeaderNavigation() {
  const { data: navigationData, isLoading, error } = useNavigation('header');

  // Default fallback navigation
  const defaultNavigation = useMemo(
    () => [
      {
        title: 'Category',
        path: paths.product.root,
        icon: <Iconify icon="eva:grid-fill" />,
      },
      {
        title: 'Premium',
        path: paths.premium,
        icon: <Iconify icon="eva:star-fill" />,
      },
      {
        title: 'About Us',
        path: paths.about,
        icon: <Iconify icon="eva:info-fill" />,
      },
    ],
    []
  );

  // Transform CMS navigation data
  const cmsNavigation = useMemo(() => {
    if (!navigationData || !navigationData.items) {
      return null;
    }
    return transformNavigationItems(navigationData.items);
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
