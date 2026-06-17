import PropTypes from 'prop-types';
// @mui
import Collapse from '@mui/material/Collapse';
import { listClasses } from '@mui/material/List';
import { listItemButtonClasses } from '@mui/material/ListItemButton';
import { listItemTextClasses } from '@mui/material/ListItemText';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
// components
import { NavSectionVertical } from 'src/components/nav-section';
import { usePathname } from 'src/routes/hook';
//
import NavItem from './nav-item';

// ----------------------------------------------------------------------

export default function NavList({ item, onOpenCategories }) {
  const pathname = usePathname();

  const { path, children, title, onClick } = item;

  const externalLink = path.includes('http');

  const nav = useBoolean();

  const handleToggle = () => {
    if (title === 'Categories' && onOpenCategories) {
      onOpenCategories();
    } else if (onClick && !children) {
      onClick();
    } else {
      nav.onToggle();
    }
  };

  return (
    <>
      <NavItem
        item={item}
        open={nav.value}
        onClick={handleToggle}
        active={pathname === path}
        externalLink={externalLink}
      />

      {!!children && title !== 'Categories' && (
        <Collapse in={nav.value} unmountOnExit>
          <NavSectionVertical
            data={children}
            sx={{
              [`& .${listClasses.root}`]: {
                '&:last-of-type': {
                  [`& .${listItemButtonClasses.root}`]: {
                    height: 160,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    bgcolor: 'background.neutral',
                    backgroundRepeat: 'no-repeat',
                    backgroundImage: 'url(/assets/illustrations/illustration_dashboard.png)',
                    [`& .${listItemTextClasses.root}`]: {
                      display: 'none',
                    },
                  },
                },
              },
            }}
          />
        </Collapse>
      )}
    </>
  );
}

NavList.propTypes = {
  item: PropTypes.object,
  onOpenCategories: PropTypes.func,
};
