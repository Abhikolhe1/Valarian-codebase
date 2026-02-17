/**
 * Navigation Utilities
 * Helper functions for transforming CMS navigation data
 */

import Iconify from 'src/components/iconify';

/**
 * Transform CMS navigation menu items to the format expected by nav components
 * @param {Array} items - CMS menu items
 * @returns {Array} Transformed navigation items
 */
export function transformNavigationItems(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      title: item.label,
      path: item.url,
      icon: item.icon ? <Iconify icon={item.icon} /> : undefined,
      openInNewTab: item.openInNewTab,
      children: item.children ? transformNavigationItems(item.children) : undefined,
    }));
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

  return transformNavigationItems(navigationData.items);
}
