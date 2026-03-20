import { useMemo } from 'react';
import { useNavigation } from 'src/api/cms-query';
import Iconify from 'src/components/iconify';
import { paths } from 'src/routes/paths';
import { transformHeaderNavigation } from 'src/utils/navigation';

/**
 * Hook to fetch and transform header navigation from CMS
 * Falls back to default navigation if CMS data is unavailable
 */
export function useHeaderNavigation() {
  const { data: navigationData, isLoading, error } = useNavigation('header');

  // Debug logging
  console.log('Header Navigation Debug:', {
    navigationData,
    isLoading,
    error,
    hasItems: navigationData?.items?.length > 0
  });

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
    if (!navigationData || !navigationData.items || navigationData.items.length === 0) {
      console.log('Using default navigation - no CMS data available');
      return null;
    }

    const transformed = transformHeaderNavigation(navigationData);
    console.log('Transformed CMS navigation:', transformed);
    return transformed;
  }, [navigationData]);

  // Return CMS navigation if available, otherwise fallback
  const navigation = cmsNavigation || defaultNavigation;

  console.log('Final navigation:', navigation);

  return {
    navigation,
    isLoading,
    error,
    isFromCMS: !!cmsNavigation,
  };
}
