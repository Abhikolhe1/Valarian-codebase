import { useMemo } from 'react';
import { useNavigation } from 'src/api/cms-query';
import Iconify from 'src/components/iconify';
import { paths } from 'src/routes/paths';
import { transformNavigationItems } from 'src/utils/navigation';

function ensureMobileContactLink(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return items;
  }

  const hasContact = items.some((item) => item?.path === paths.contact || item?.title === 'Contact Us');

  if (hasContact) {
    return items;
  }

  const contactItem = {
    title: 'Contact Us',
    path: paths.contact,
    icon: <Iconify icon="eva:phone-call-fill" />,
  };

  const aboutIndex = items.findIndex((item) => item?.path === paths.about || item?.title === 'About Us');

  if (aboutIndex === -1) {
    return [...items, contactItem];
  }

  return [...items.slice(0, aboutIndex + 1), contactItem, ...items.slice(aboutIndex + 1)];
}

/**
 * Hook to fetch and transform mobile navigation from CMS
 * Falls back to default navigation if CMS data is unavailable
 */
export function useMobileNavigation() {
  const { data: navigationData, isLoading, error } = useNavigation('mobile');

  // Default fallback navigation
  const defaultNavigation = useMemo(
    () => [
      {
        title: 'Home',
        path: '/',
        icon: <Iconify icon="solar:home-2-bold-duotone" />,
      },
      {
        title: 'Categories',
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
      {
        title: 'Contact Us',
        path: paths.contact,
        icon: <Iconify icon="eva:phone-call-fill" />,
      },
      {
        title: 'Profile',
        path: paths.profile,
        icon: <Iconify icon="eva:person-fill" />,
      },

      // { title: 'My Profile', path: paths.profile },
      { title: 'Order History', path: paths.order.history, icon: <Iconify icon="mdi:clipboard-text-history" />, },
      { title: 'Favorites', path: paths.favorites, icon: <Iconify icon="mdi:heart" />, },


    ],
    []
  );

  // Transform CMS navigation data
  const cmsNavigation = useMemo(() => {
    if (!navigationData || !navigationData.items) {
      return null;
    }
    return ensureMobileContactLink(transformNavigationItems(navigationData.items));
  }, [navigationData]);

  // Return CMS navigation if available, otherwise fallback
  const navigation = cmsNavigation || ensureMobileContactLink(defaultNavigation);

  return {
    navigation,
    isLoading,
    error,
    isFromCMS: !!cmsNavigation,
  };
}
