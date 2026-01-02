import { useState, useEffect, useRef } from 'react';
// @mui
import { useTheme, styled, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import ClickAwayListener from '@mui/material/ClickAwayListener';
// hooks
import { useOffSetTop } from 'src/hooks/use-off-set-top';
import { useResponsive } from 'src/hooks/use-responsive';
import { usePathname } from 'src/routes/hook';
import { useMarqueeVisibility } from 'src/hooks/use-marquee-visibility';
// theme
import { bgBlur } from 'src/theme/css';
// routes
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components'; 
// components
import Logo from 'src/components/logo';
import Iconify from 'src/components/iconify';
//
import { HEADER } from '../config-layout';
import { navConfig } from './config-navigation';
import NavMobile from './nav/mobile';
import HeaderShadow from '../_common/header-shadow';

// ----------------------------------------------------------------------

const StyledNavLink = styled(Link)(({ theme, active, isTransparent }) => {
  let linkColor = theme.palette.text.primary;
  
  if (isTransparent) {
    linkColor = theme.palette.common.white;
  } else if (active) {
    linkColor = theme.palette.warning.main;
  }

  return {
    color: linkColor,
    textDecoration: 'none',
    fontSize: '0.9375rem',
    fontWeight: active ? 600 : 400,
    transition: theme.transitions.create(['color'], {
      duration: theme.transitions.duration.standard,
    }),
    '&:hover': {
      color: theme.palette.warning.main,
    },
  };
});


const StyledExpandableSearch = styled(Box)(({ theme, expanded, isTransparent, isMobile }) => ({
  display: 'flex',
  alignItems: 'center',
  height: 36,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: expanded 
    ? alpha(theme.palette.common.white, isTransparent ? 0.95 : 1)
    : 'transparent',
  border: expanded 
    ? `1px solid ${alpha(theme.palette.grey[500], 0.2)}`
    : 'none',
  overflow: 'hidden',
  transition: theme.transitions.create(['width', 'background-color', 'border'], {
    duration: theme.transitions.duration.standard,
    easing: theme.transitions.easing.easeInOut,
  }),
  width: expanded ? 300 : 36,
  minWidth: 36,
  maxWidth: expanded ? 300 : 36,
  '&:hover': {
    backgroundColor: expanded 
      ? alpha(theme.palette.common.white, isTransparent ? 0.95 : 1)
      : alpha(theme.palette.common.white, isTransparent ? 0.1 : 0.05),
  },
  // Mobile: Don't expand inline, keep as icon only
  [theme.breakpoints.down('md')]: {
    width: 36,
    maxWidth: 36,
  },
}));

const StyledSearchInput = styled('input')(({ theme, isTransparent, expanded }) => {
  // Determine text color: when expanded, always use dark; otherwise respect transparency
  let textColor = theme.palette.text.primary;
  if (!expanded && isTransparent) {
    textColor = theme.palette.common.white;
  }

  // Determine placeholder color
  let placeholderColor = alpha(theme.palette.text.primary, 0.5);
  if (!expanded && isTransparent) {
    placeholderColor = alpha(theme.palette.common.white, 0.6);
  }

  return {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    padding: theme.spacing(0, 1.5),
    fontSize: '0.875rem',
    color: textColor,
    '&::placeholder': {
      color: placeholderColor,
    },
    '&:focus': {
      outline: 'none',
    },
  };
});

const StyledSearchIconButton = styled(IconButton)(({ theme, expanded, isTransparent }) => {
  // Determine icon color: when expanded, always use dark; otherwise respect transparency
  let iconColor = theme.palette.text.primary;
  if (!expanded && isTransparent) {
    iconColor = theme.palette.common.white;
  }

  // Determine hover background
  let hoverBg = 'transparent';
  if (!expanded) {
    hoverBg = alpha(theme.palette.common.white, isTransparent ? 0.1 : 0.05);
  }

  return {
    flexShrink: 0,
    width: 36,
    height: 36,
    padding: 0,
    color: iconColor,
    transition: theme.transitions.create(['color', 'background-color'], {
      duration: theme.transitions.duration.standard,
    }),
    '&:hover': {
      backgroundColor: hoverBg,
    },
  };
});

const StyledCloseButton = styled(IconButton)(({ theme, isTransparent, expanded }) => {
  // Determine close button color
  let closeColor = alpha(theme.palette.text.primary, 0.7);
  if (!expanded && isTransparent) {
    closeColor = alpha(theme.palette.common.white, 0.7);
  }

  // Determine hover color
  let hoverColor = theme.palette.text.primary;
  if (!expanded && isTransparent) {
    hoverColor = theme.palette.common.white;
  }

  return {
    flexShrink: 0,
    width: 32,
    height: 32,
    padding: 0,
    marginRight: theme.spacing(0.5),
    color: closeColor,
    transition: theme.transitions.create(['color', 'opacity'], {
      duration: theme.transitions.duration.shorter,
    }),
    '&:hover': {
      backgroundColor: 'transparent',
      color: hoverColor,
    },
  };
});

// Mobile search overlay - appears below header
const StyledMobileSearchOverlay = styled(Box)(({ theme, visible, headerTop }) => ({
  position: 'fixed',
  top: headerTop,
  left: 0,
  right: 0,
  zIndex: theme.zIndex.appBar + 10,
  backgroundColor: theme.palette.common.white,
  borderBottom: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
  padding: theme.spacing(1.5, 2),
  transform: visible ? 'translateY(0)' : 'translateY(-100%)',
  opacity: visible ? 1 : 0,
  transition: theme.transitions.create(['transform', 'opacity'], {
    duration: theme.transitions.duration.standard,
    easing: theme.transitions.easing.easeInOut,
  }),
  pointerEvents: visible ? 'auto' : 'none',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  boxShadow: visible ? theme.shadows[2] : 'none',
}));

const StyledMobileSearchInput = styled('input')(({ theme }) => ({
  flex: 1,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  padding: theme.spacing(1, 1.5),
  fontSize: '0.9375rem',
  color: theme.palette.text.primary,
  '&::placeholder': {
    color: alpha(theme.palette.text.primary, 0.5),
  },
  '&:focus': {
    outline: 'none',
  },
}));

// ----------------------------------------------------------------------

export default function Header() {
  const theme = useTheme();
  const pathname = usePathname();
  const mdUp = useResponsive('up', 'md');
  const offsetTop = useOffSetTop(HEADER.H_DESKTOP);
  const marqueeVisible = useMarqueeVisibility();
  
  const isHome = pathname === '/';
  const [showLogo, setShowLogo] = useState(!isHome);
  const [headerBgOpacity, setHeaderBgOpacity] = useState(isHome ? 0 : 1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef(null);
  
  // Marquee height: 36px desktop, 32px mobile
  const marqueeHeight = mdUp ? 36 : 32;

  // Show header logo and background after scroll threshold (when animated logo fades out)
  useEffect(() => {
    if (!isHome) {
      setShowLogo(true);
      setHeaderBgOpacity(1);
      return undefined;
    }

    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      // Show header logo and background after 400px scroll (when animated logo transitions)
      if (scrollY > 400) {
        setShowLogo(true);
        setHeaderBgOpacity(1);
      } else {
        setShowLogo(false);
        setHeaderBgOpacity(0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHome]);

  // Focus search input when expanded
  useEffect(() => {
    if (searchExpanded && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [searchExpanded]);

  const handleSearchClick = () => {
    setSearchExpanded(true);
  };

  const handleSearchClose = () => {
    setSearchExpanded(false);
    setSearchQuery('');
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      handleSearchClose();
    }
  };

  // Mobile: Handle search overlay
  const handleMobileSearchClick = () => {
    setSearchExpanded(true);
  };

  const handleMobileSearchClose = () => {
    setSearchExpanded(false);
    setSearchQuery('');
  };

  const handleMobileSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      handleMobileSearchClose();
    }
  };

  return (
    <AppBar 
      data-header="main"
      sx={{
        backgroundColor: `rgba(255, 255, 255, ${headerBgOpacity})`,
        color: theme.palette.text.primary,
        boxShadow: offsetTop && headerBgOpacity > 0 ? theme.shadows[4] : 'none',
        top: marqueeVisible ? marqueeHeight : 0,
        transition: theme.transitions.create(['backgroundColor', 'boxShadow', 'top'], {
          duration: theme.transitions.duration.standard,
        }),
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          height: {
            xs: HEADER.H_MOBILE,
            md: HEADER.H_DESKTOP,
          },
          transition: theme.transitions.create(['height'], {
            easing: theme.transitions.easing.easeInOut,
            duration: theme.transitions.duration.shorter,
          }),
          ...(offsetTop && {
            ...bgBlur({
              color: theme.palette.background.default,
            }),
            height: {
              md: HEADER.H_DESKTOP_OFFSET,
            },
          }),
        }}
      >
        <Container sx={{ height: 1, display: 'flex', alignItems: 'center', position: 'relative' }}>
          {/* Left: Expandable Search - Desktop only inline expansion */}
          {mdUp && (
            <>
              {searchExpanded ? (
                <ClickAwayListener onClickAway={handleSearchClose}>
                  <StyledExpandableSearch 
                    expanded={searchExpanded}
                    isTransparent={headerBgOpacity === 0}
                    isMobile={false}
                  >
                    <StyledSearchIconButton
                      expanded
                      isTransparent={headerBgOpacity === 0}
                      sx={{ pointerEvents: 'none' }}
                    >
                      <Iconify icon="eva:search-fill" width={18} />
                    </StyledSearchIconButton>
                    <StyledSearchInput
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onKeyDown={handleSearchKeyDown}
                      isTransparent={headerBgOpacity === 0}
                      expanded
                    />
                    <StyledCloseButton
                      onClick={handleSearchClose}
                      isTransparent={headerBgOpacity === 0}
                      expanded
                      size="small"
                    >
                      <Iconify icon="eva:close-fill" width={16} />
                    </StyledCloseButton>
                  </StyledExpandableSearch>
                </ClickAwayListener>
              ) : (
                <StyledExpandableSearch 
                  expanded={searchExpanded}
                  isTransparent={headerBgOpacity === 0}
                  isMobile={false}
                >
                  <StyledSearchIconButton
                    onClick={handleSearchClick}
                    expanded={false}
                    isTransparent={headerBgOpacity === 0}
                  >
                    <Iconify icon="eva:search-fill" width={20} />
                  </StyledSearchIconButton>
                </StyledExpandableSearch>
              )}
            </>
          )}
          {!mdUp && (
            // Mobile: Search icon only (overlay opens on click)
            <StyledSearchIconButton
              onClick={handleMobileSearchClick}
              expanded={false}
              isTransparent={headerBgOpacity === 0}
            >
              <Iconify icon="eva:search-fill" width={20} />
            </StyledSearchIconButton>
          )}

          {/* Center: Logo */}
          <Box
            sx={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              opacity: showLogo ? 1 : 0,
              transition: theme.transitions.create('opacity', {
                duration: theme.transitions.duration.short,
              }),
            }}
          >
            <Logo />
          </Box>

          {/* Spacer between search and center logo */}
          <Box sx={{ flexGrow: 1 }} />

          <Stack direction="row" spacing={{ xs: 1, md: 3 }} alignItems="center">
            {/* Navigation Links */}
            {mdUp && (
              <Stack direction="row" spacing={3} sx={{ mr: 2 }}>
                <StyledNavLink
                  component={RouterLink}
                  href={paths.product.root}
                  active={pathname === paths.product.root ? 1 : 0}
                  isTransparent={headerBgOpacity === 0 ? 1 : 0}
                >
                  Categories
                </StyledNavLink>
                <StyledNavLink
                  component={RouterLink}
                  href={paths.pricing}
                  active={pathname === paths.pricing ? 1 : 0}
                  isTransparent={headerBgOpacity === 0 ? 1 : 0}
                >
                  Premium
                </StyledNavLink>
                <StyledNavLink
                  component={RouterLink}
                  href={paths.about}
                  active={pathname === paths.about ? 1 : 0}
                  isTransparent={headerBgOpacity === 0 ? 1 : 0}
                >
                  About Us
                </StyledNavLink>
              </Stack>
            )}

            {/* Action Icons */}
            <Stack direction="row" spacing={0.5}>
              {/* Heart Icon - Hidden on Mobile */}
              <IconButton
                size="small"
                sx={{
                  color: headerBgOpacity > 0 ? 'text.primary' : 'common.white',
                  display: { xs: 'none', md: 'inline-flex' },
                  transition: theme.transitions.create('color', {
                    duration: theme.transitions.duration.standard,
                  }),
                  '&:hover': {
                    backgroundColor: headerBgOpacity > 0 ? 'action.hover' : 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                <Iconify icon="eva:heart-fill" width={20} />
              </IconButton>

              <IconButton
                size="small"
                sx={{
                  color: headerBgOpacity > 0 ? 'text.primary' : 'common.white',
                  transition: theme.transitions.create('color', {
                    duration: theme.transitions.duration.standard,
                  }),
                  '&:hover': {
                    backgroundColor: headerBgOpacity > 0 ? 'action.hover' : 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                <Iconify icon="eva:shopping-cart-fill" width={20} />
              </IconButton>

              <IconButton
                size="small"
                sx={{
                  color: headerBgOpacity > 0 ? 'text.primary' : 'common.white',
                  display: { xs: 'none', md: 'inline-flex' }, // Hidden on mobile, shown on desktop
                  transition: theme.transitions.create('color', {
                    duration: theme.transitions.duration.standard,
                  }),
                  '&:hover': {
                    backgroundColor: headerBgOpacity > 0 ? 'action.hover' : 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                <Iconify icon="eva:person-fill" width={20} />
              </IconButton>

              {/* Mobile Menu */}
              {!mdUp && (
                <NavMobile 
                  offsetTop={offsetTop && headerBgOpacity > 0} 
                  data={navConfig}
                  isTransparent={headerBgOpacity === 0}
                />
              )}
            </Stack>
          </Stack>
        </Container>
      </Toolbar>

      {offsetTop && headerBgOpacity > 0 && <HeaderShadow />}

      {/* Mobile Search Overlay */}
      {!mdUp && searchExpanded && (
        <ClickAwayListener onClickAway={handleMobileSearchClose}>
          <StyledMobileSearchOverlay 
            visible={searchExpanded}
            headerTop={marqueeVisible ? marqueeHeight + HEADER.H_MOBILE : HEADER.H_MOBILE}
          >
            <Iconify icon="eva:search-fill" width={20} sx={{ color: 'text.secondary', flexShrink: 0 }} />
            <StyledMobileSearchInput
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleMobileSearchKeyDown}
            />
            <IconButton
              onClick={handleMobileSearchClose}
              size="small"
              sx={{
                flexShrink: 0,
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <Iconify icon="eva:close-fill" width={18} />
            </IconButton>
          </StyledMobileSearchOverlay>
        </ClickAwayListener>
      )}
    </AppBar>
  );
}
