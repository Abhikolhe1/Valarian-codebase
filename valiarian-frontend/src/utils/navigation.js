/**
 * Navigation Utilities
 * Helper functions for transforming CMS navigation data
 */

import Iconify from 'src/components/iconify';

/**
 * Transform CMS navigation menu items to the format expected by nav components
 * @param {Array} items - CMS menu items from admin panel
 * @returns {Array} Transformed navigation items
 */
export function transformNavigationItems(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => !item.parentId) // Get top-level items first
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((item) => ({
      title: item.label,
      path: item.url,
      icon: item.icon ? <Iconify icon={item.icon} /> : undefined,
      openInNewTab: item.openInNewTab,
      children: item.children ? transformNavigationItems(item.children) : undefined,
    }));
}

/**
 * Transform CMS navigation response to header navigation format
 * @param {Object} navigationData - CMS navigation response from admin panel
 * @returns {Array} Transformed navigation items for header
 */
export function transformHeaderNavigation(navigationData) {
  if (!navigationData || !navigationData.items || !Array.isArray(navigationData.items)) {
    return [];
  }

  return navigationData.items
    .filter((item) => !item.parentId) // Get top-level items
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((item) => ({
      title: item.label,
      path: item.url,
      icon: item.icon ? <Iconify icon={item.icon} /> : undefined,
      openInNewTab: item.openInNewTab,
    }));
}

/**
 * Transform CMS navigation response to footer navigation format
 * @param {Object} navigationData - CMS navigation response from admin panel
 * @returns {Array} Transformed navigation items for footer
 */
export function transformFooterNavigation(navigationData) {
  if (!navigationData || !navigationData.items || !Array.isArray(navigationData.items)) {
    return [];
  }

  // Group items by parent (top-level items become headlines)
  const grouped = [];
  const topLevelItems = navigationData.items
    .filter((item) => !item.parentId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  topLevelItems.forEach((parent) => {
    const children = navigationData.items
      .filter((item) => item.parentId === parent.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
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
}

/**
 * Build nested menu structure from flat menu items
 * @param {Array} items - Flat array of menu items
 * @returns {Array} Nested menu structure
 */
export function buildMenuTree(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  const itemMap = {};
  const rootItems = [];

  // Create a map of all items
  items.forEach((item) => {
    itemMap[item.id] = { ...item, children: [] };
  });

  // Build the tree structure
  items.forEach((item) => {
    if (item.parentId && itemMap[item.parentId]) {
      itemMap[item.parentId].children.push(itemMap[item.id]);
    } else {
      rootItems.push(itemMap[item.id]);
    }
  });

  return rootItems;
}

/**
 * Filter navigation items by location
 * @param {Object} navigationData - CMS navigation response
 * @param {string} location - Navigation location (header, footer, mobile)
 * @returns {Array} Filtered navigation items
 */
export function getNavigationByLocation(navigationData, location) {
  if (!navigationData || !navigationData.items) {
    return [];
  }

  if (location === 'header') {
    return transformHeaderNavigation(navigationData);
  }

  if (location === 'footer') {
    return transformFooterNavigation(navigationData);
  }

  return transformNavigationItems(navigationData.items);
}
