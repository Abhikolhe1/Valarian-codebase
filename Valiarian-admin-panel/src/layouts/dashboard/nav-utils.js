const filterNavChildren = (items, currentRole) =>
  items
    .map((item) => {
      if (item.roles && !item.roles.includes(currentRole)) {
        return null;
      }

      if (!item.children) {
        return item;
      }

      const children = filterNavChildren(item.children, currentRole);

      if (!children.length && !item.path) {
        return null;
      }

      return {
        ...item,
        children,
      };
    })
    .filter(Boolean);

export function filterNavGroupsByRole(groups, currentRole) {
  return groups
    .map((group) => ({
      ...group,
      items: filterNavChildren(group.items, currentRole),
    }))
    .filter((group) => group.items.length > 0);
}

