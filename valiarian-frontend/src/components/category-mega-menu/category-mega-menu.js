import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Fade from '@mui/material/Fade';
import Paper from '@mui/material/Paper';
import Portal from '@mui/material/Portal';
import Stack from '@mui/material/Stack';
import { alpha, styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
// routes
import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';
import { usePathname } from 'src/routes/hook';
// theme
import { bgBlur } from 'src/theme/css';
// api
import { useGetCategories, useGetCategoryTree } from 'src/api/category';
// components
import Skeleton from '@mui/material/Skeleton';

// ----------------------------------------------------------------------

const StyledMegaMenu = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  padding: theme.spacing(3),
  boxShadow: theme.customShadows.z24,
  borderRadius: theme.shape.borderRadius * 1.5,
  ...bgBlur({
    color: theme.palette.background.paper,
  }),
  zIndex: theme.zIndex.modal,
  width: '80%',
  maxWidth: 1200,
  height: '50%',
  maxHeight: 500,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  flexDirection: 'column',

  overflow: 'hidden',
  [theme.breakpoints.down('md')]: {
    width: '90vw',
    maxWidth: '90vw',
  },
}));

const CategoryList = styled(Stack)(({ theme }) => ({
  width: '60%',
  minWidth: 300,
  paddingRight: theme.spacing(3),
  borderRight: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
  overflowY: 'auto',
  overflowX: 'hidden',
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  columnGap: theme.spacing(3),
  rowGap: theme.spacing(2),
  [theme.breakpoints.down('md')]: {
    width: '100%',
    borderRight: 'none',
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
    paddingRight: 0,
    paddingBottom: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
}));

const CategoryGroup = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '&:last-child': {
    marginBottom: 0,
  },
}));

const CategoryGroupTitle = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  fontWeight: 700,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(1),
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}));

const SubCategoryItem = styled(Box)(({ theme, active }) => ({
  padding: theme.spacing(0.75, 1.5),
  cursor: 'pointer',
  borderRadius: theme.shape.borderRadius,
  transition: theme.transitions.create(['background-color', 'color'], {
    duration: theme.transitions.duration.shorter,
  }),
  color: active ? theme.palette.primary.main : theme.palette.text.secondary,
  backgroundColor: active ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
  fontWeight: active ? 600 : 400,
  fontSize: '0.875rem',
  display: 'flex',
  alignItems: 'center',
  position: 'relative',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, active ? 0.12 : 0.04),
    color: theme.palette.primary.main,
  },
  '&::before': active
    ? {
        content: '""',
        position: 'absolute',
        left: theme.spacing(0.5),
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: theme.palette.primary.main,
      }
    : {},
}));

const ImagePreview = styled(Box)(({ theme }) => ({
  width: '40%',
  height: '100%',
  // minHeight: 400,
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  backgroundColor: theme.palette.grey[100],
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  [theme.breakpoints.down('md')]: {
    width: '100%',
    minHeight: 300,
  },
}));

const PreviewTitle = styled(Typography)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  left: theme.spacing(2),
  right: theme.spacing(2),
  zIndex: 2,
  fontSize: '1rem',
  fontWeight: 700,
  color: theme.palette.text.primary,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}));

const PreviewImage = styled('img')(() => ({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  objectPosition: 'center',
  position: 'absolute',
  top: 0,
  left: 0,
}));

// ----------------------------------------------------------------------

// Default placeholder images
const PLACEHOLDER_IMAGE =
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRUHOpowQpT8ZqJLNRZ1LIcQlmsAd1aPqugpg&s';

// ... rest of styled components remain same until DEFAULT_CATEGORY_GROUPS ...

const DEFAULT_IMAGE = PLACEHOLDER_IMAGE;

// ----------------------------------------------------------------------

function resolveCategoryImage(category) {
  return (
    category?.image ||
    category?.coverImage ||
    category?.thumbnailUrl ||
    category?.thumbnail ||
    category?.media?.url ||
    category?.media?.thumbnailUrl ||
    ''
  );
}

export default function CategoryMegaMenu({
  open,
  onClose,
  anchorEl,
  defaultImage = DEFAULT_IMAGE,
  isTransparent = false,
}) {
  const { categories } = useGetCategories();
  const { categoryTree, treeLoading, treeError } = useGetCategoryTree();
  console.log('Category Tree:', categoryTree, 'Loading:', treeLoading, 'Error:', treeError);

  const pathname = usePathname();
  const [hoveredSubcategory, setHoveredSubcategory] = useState(null);
  const menuRef = useRef(null);
  const timeoutRef = useRef(null);
  const anchorRef = useRef(anchorEl);

  const categoryImageMap = categories.reduce((acc, category) => {
    const keyCandidates = [category?.id, category?.slug, category?.name]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    const image = resolveCategoryImage(category);

    keyCandidates.forEach((key) => {
      acc[key] = image;
    });

    return acc;
  }, {});

  // Transform backend tree to expected frontend shape
  const categoryGroups = categoryTree.map((parent) => ({
    group: parent.name,
    subcategories: parent.children.map((child) => ({
      id: child.id,
      name: child.name,
      slug: child.slug,
      path: paths.product.category(child.slug),
      image:
        categoryImageMap[String(child?.id || '').toLowerCase()] ||
        categoryImageMap[String(child?.slug || '').toLowerCase()] ||
        categoryImageMap[String(child?.name || '').toLowerCase()] ||
        resolveCategoryImage(child),
    })),
  }));

  // Keep anchor ref updated
  useEffect(() => {
    anchorRef.current = anchorEl;
  }, [anchorEl]);

  // Close menu when route changes (navigation occurs)
  useEffect(() => {
    if (open) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Calculate position with viewport boundary detection
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !anchorEl) {
      return undefined;
    }

    const updatePosition = () => {
      if (!anchorEl) return;

      const anchorRect = anchorEl.getBoundingClientRect();
      const menuHeight = 500; // approximate height
      const viewportHeight = window.innerHeight;
      const padding = 16; // padding from viewport edges

      // Since both header and menu are fixed, use viewport coordinates (not document coordinates)
      // Calculate position below the anchor (header) - viewport relative
      let top = anchorRect.bottom + 8; // Gap below header in viewport coordinates

      // Adjust if menu would go off bottom edge of viewport
      const bottomEdge = top + menuHeight;
      const maxBottom = viewportHeight - padding;
      if (bottomEdge > maxBottom) {
        // Try positioning above anchor
        const topPosition = anchorRect.top - menuHeight - 8;
        if (topPosition >= padding) {
          top = topPosition;
        } else {
          // If can't fit above, align to bottom of viewport
          top = maxBottom - menuHeight;
        }
      }

      // Ensure menu doesn't go above viewport
      if (top < padding) {
        top = padding;
      }

      // Left is handled by CSS transform (centered)
      setPosition({ top, left: 0 });
    };

    // Initial position calculation
    updatePosition();

    // Update position on scroll and resize (header position changes on scroll)
    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, anchorEl]);

  // Preload images
  useEffect(() => {
    if (open && categoryGroups.length > 0) {
      const imagesToPreload = [
        defaultImage,
        ...categoryGroups.flatMap((group) => group.subcategories.map((sub) => sub.image)),
      ].filter(Boolean);

      imagesToPreload.forEach((src) => {
        try {
          const img = new Image();
          img.src = src;
        } catch (error) {
          console.warn('Failed to preload image:', src);
        }
      });
    }
  }, [open, defaultImage, categoryGroups]);

  const handleSubcategoryHover = useCallback((subcategory, groupName) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setHoveredSubcategory({ ...subcategory, groupName });
  }, []);

  const handleSubcategoryLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setHoveredSubcategory(null);
    }, 100);
  }, []);

  const handleSubcategoryClick = useCallback(
    (e) => {
      // Close the dialog immediately when category is clicked
      e.stopPropagation();
      onClose();
    },
    [onClose]
  );

  // Get current preview data
  const previewData = hoveredSubcategory || {
    name: categoryGroups[0]?.subcategories[0]?.name || '',
    groupName: categoryGroups[0]?.group || '',
    image: defaultImage,
  };

  // 🔹 derive title
  const previewTitle = hoveredSubcategory
    ? `${hoveredSubcategory.name.toUpperCase()} ${hoveredSubcategory.groupName}`
    : `${previewData.groupName} ${previewData.name ? previewData.name.toUpperCase() : ''}`;

  // 🔹 title animation state
  const [displayTitle, setDisplayTitle] = useState(previewTitle);
  const [titleVisible, setTitleVisible] = useState(true);

  // 🔹 image animation state
  const [displayImage, setDisplayImage] = useState(hoveredSubcategory?.image || defaultImage);
  const [imageVisible, setImageVisible] = useState(true);

  useEffect(() => {
    setTitleVisible(false);

    const timeout = setTimeout(() => {
      setDisplayTitle(previewTitle);
      setTitleVisible(true);
    }, 150);

    return () => clearTimeout(timeout);
  }, [previewTitle]);

  useEffect(() => {
    if (!open) return undefined;

    setImageVisible(false);

    const timeout = setTimeout(() => {
      const newImage = hoveredSubcategory ? hoveredSubcategory.image : defaultImage;
      setDisplayImage(newImage);
      setImageVisible(true);
    }, 150);

    return () => clearTimeout(timeout);
  }, [hoveredSubcategory, defaultImage, open]);

  const renderCategoryListContent = () => {
    if (treeLoading) {
      return [...Array(6)].map((_, i) => (
        <Box key={i} sx={{ mb: 2 }}>
          <Skeleton width="60%" height={24} sx={{ mb: 1 }} />
          <Skeleton width="80%" height={20} />
          <Skeleton width="70%" height={20} />
        </Box>
      ));
    }

    if (categoryGroups.length > 0) {
      return categoryGroups.map((group) => (
        <CategoryGroup key={group.group}>
          <CategoryGroupTitle>{group.group}</CategoryGroupTitle>
          <Stack spacing={0.25}>
            {group.subcategories.map((subcategory) => (
              <SubCategoryItem
                key={subcategory.name}
                component={RouterLink}
                href={subcategory.path}
                active={
                  hoveredSubcategory?.name === subcategory.name &&
                  hoveredSubcategory?.groupName === group.group
                    ? 1
                    : 0
                }
                onMouseEnter={() => handleSubcategoryHover(subcategory, group.group)}
                onMouseLeave={handleSubcategoryLeave}
                onClick={handleSubcategoryClick}
              >
                <Typography
                  variant="body2"
                  sx={{
                    pl:
                      hoveredSubcategory?.name === subcategory.name &&
                      hoveredSubcategory?.groupName === group.group
                        ? 2
                        : 0,
                  }}
                >
                  {subcategory.name}
                </Typography>
              </SubCategoryItem>
            ))}
          </Stack>
        </CategoryGroup>
      ));
    }

    return (
      <Typography
        variant="body2"
        sx={{
          gridColumn: 'span 3',
          textAlign: 'center',
          py: 5,
          color: 'text.secondary',
        }}
      >
        No categories found
      </Typography>
    );
  };

  if (!open) return null;

  return (
    <Portal>
      <ClickAwayListener onClickAway={onClose}>
        <Fade in={open}>
          <StyledMegaMenu
            ref={menuRef}
            data-category-menu
            sx={{
              top: `${position.top}px`,
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={0}
              sx={{
                flex: 1, // 🔑 take full height of menu
                minHeight: 0, // 🔑 allow children to scroll
              }}
            >
              {/* Left Column - Category Groups */}
              <CategoryList spacing={1}>{renderCategoryListContent()}</CategoryList>

              {/* Right Column - Image Preview */}
              <ImagePreview>
                {!treeLoading && (
                  <>
                    <Fade in={titleVisible} timeout={200}>
                      <PreviewTitle>{displayTitle}</PreviewTitle>
                    </Fade>

                    {/* Image with Fade animation */}
                    <Fade in={imageVisible} timeout={300}>
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                        }}
                      >
                        {displayImage ? (
                          <PreviewImage
                            src={displayImage}
                            alt={hoveredSubcategory?.name || 'Default category'}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'text.secondary',
                              bgcolor: 'grey.100',
                              px: 3,
                              textAlign: 'center',
                            }}
                          >
                            <Typography variant="body2">
                              No category image available
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Fade>
                  </>
                )}

                {/* Fallback */}
                {!treeLoading && !hoveredSubcategory && !imageVisible && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: 'text.secondary',
                      textAlign: 'center',
                      zIndex: 0,
                      mt: 4,
                    }}
                  >
                    <Typography variant="body2">Hover over a category</Typography>
                  </Box>
                )}

                {treeLoading && <Skeleton variant="rectangular" width="100%" height="100%" />}
              </ImagePreview>
            </Stack>
          </StyledMegaMenu>
        </Fade>
      </ClickAwayListener>
    </Portal>
  );
}

CategoryMegaMenu.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  anchorEl: PropTypes.object,
  defaultImage: PropTypes.string,
  isTransparent: PropTypes.bool,
};
