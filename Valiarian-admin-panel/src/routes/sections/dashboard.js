import { lazy, Suspense } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
// auth
import { AuthGuard, DashboardRoleGuard } from 'src/auth/guard';
import { useAuthContext } from 'src/auth/hooks';
import { getDefaultDashboardPath, isAdmin } from 'src/auth/utils/role';
import { paths } from 'src/routes/paths';
// layouts
import DashboardLayout from 'src/layouts/dashboard';
// components
import { LoadingScreen } from 'src/components/loading-screen';
import CMSComingSoonPage from 'src/pages/dashboard/cms/coming-soon';

// ----------------------------------------------------------------------

// OVERVIEW
const OverviewEcommercePage = lazy(() => import('src/pages/dashboard/ecommerce'));
const OverviewAnalyticsPage = lazy(() => import('src/pages/dashboard/analytics'));
const OverviewBankingPage = lazy(() => import('src/pages/dashboard/banking'));
const OverviewBookingPage = lazy(() => import('src/pages/dashboard/booking'));
const OverviewFilePage = lazy(() => import('src/pages/dashboard/file'));
// PRODUCT
const ProductDetailsPage = lazy(() => import('src/pages/dashboard/product/details'));
const ProductListPage = lazy(() => import('src/pages/dashboard/product/list'));
const ProductCreatePage = lazy(() => import('src/pages/dashboard/product/new'));
const ProductEditPage = lazy(() => import('src/pages/dashboard/product/edit'));
// CATEGORY
const CategoryListPage = lazy(() => import('src/pages/dashboard/category/list'));
const CategoryCreatePage = lazy(() => import('src/pages/dashboard/category/new'));
const CategoryEditPage = lazy(() => import('src/pages/dashboard/category/edit'));
const ParentCategoryListPage = lazy(() => import('src/pages/dashboard/parent-category/list'));
const ParentCategoryCreatePage = lazy(() => import('src/pages/dashboard/parent-category/new'));
const ParentCategoryEditPage = lazy(() => import('src/pages/dashboard/parent-category/edit'));
// ORDER
const OrderListPage = lazy(() => import('src/pages/orders/orders-list'));
const OrderDetailsPage = lazy(() => import('src/pages/orders/order-details'));
// INVOICE
const InvoiceListPage = lazy(() => import('src/pages/dashboard/invoice/list'));
const InvoiceDetailsPage = lazy(() => import('src/pages/dashboard/invoice/details'));
const InvoiceCreatePage = lazy(() => import('src/pages/dashboard/invoice/new'));
const InvoiceEditPage = lazy(() => import('src/pages/dashboard/invoice/edit'));
// USER
const UserProfilePage = lazy(() => import('src/pages/dashboard/user/profile'));
const UserCardsPage = lazy(() => import('src/pages/dashboard/user/cards'));
const UserListPage = lazy(() => import('src/pages/dashboard/user/list'));
const UserAccountPage = lazy(() => import('src/pages/dashboard/user/account'));
const UserCreatePage = lazy(() => import('src/pages/dashboard/user/new'));
const UserEditPage = lazy(() => import('src/pages/dashboard/user/edit'));
// ADMINS
const AdminListPage = lazy(() => import('src/pages/dashboard/admins/list'));
const AdminCreatePage = lazy(() => import('src/pages/dashboard/admins/new'));
const AdminEditPage = lazy(() => import('src/pages/dashboard/admins/edit'));
// BLOG
const BlogPostsPage = lazy(() => import('src/pages/dashboard/post/list'));
const BlogPostPage = lazy(() => import('src/pages/dashboard/post/details'));
const BlogNewPostPage = lazy(() => import('src/pages/dashboard/post/new'));
const BlogEditPostPage = lazy(() => import('src/pages/dashboard/post/edit'));
// JOB
const JobDetailsPage = lazy(() => import('src/pages/dashboard/job/details'));
const JobListPage = lazy(() => import('src/pages/dashboard/job/list'));
const JobCreatePage = lazy(() => import('src/pages/dashboard/job/new'));
const JobEditPage = lazy(() => import('src/pages/dashboard/job/edit'));
// TOUR
const TourDetailsPage = lazy(() => import('src/pages/dashboard/tour/details'));
const TourListPage = lazy(() => import('src/pages/dashboard/tour/list'));
const TourCreatePage = lazy(() => import('src/pages/dashboard/tour/new'));
const TourEditPage = lazy(() => import('src/pages/dashboard/tour/edit'));
// CMS
const CMSPagesListPage = lazy(() => import('src/pages/dashboard/cms/pages-list'));
const CMSAboutPage = lazy(() => import('src/pages/dashboard/cms/about-us/index'));
const CMSPremiumPage = lazy(() => import('src/pages/dashboard/cms/premium'));
const CMSPageCreatePage = lazy(() => import('src/pages/dashboard/cms/pages-new'));
const CMSPageDetailsPage = lazy(() => import('src/pages/dashboard/cms/pages-details'));
const CMSPageEditPage = lazy(() => import('src/pages/dashboard/cms/pages-edit'));
const CMSMediaListPage = lazy(() => import('src/pages/dashboard/cms/media-list'));
const CMSNavigationPage = lazy(() => import('src/pages/dashboard/cms/navigation'));
const CMSSettingsPage = lazy(() => import('src/pages/dashboard/cms/settings'));
const CMSContactSubmissionsPage = lazy(() => import('src/pages/dashboard/cms/conatct-us/contact-submissions'));
const ConatactUsEditPage = lazy(() => import('src/pages/dashboard/cms/conatct-us/contact-us-view'));
// FILE MANAGER
const FileManagerPage = lazy(() => import('src/pages/dashboard/file-manager'));
// APP
const ChatPage = lazy(() => import('src/pages/dashboard/chat'));
const MailPage = lazy(() => import('src/pages/dashboard/mail'));
const CalendarPage = lazy(() => import('src/pages/dashboard/calendar'));
const KanbanPage = lazy(() => import('src/pages/dashboard/kanban'));
// TEST RENDER PAGE BY ROLE
const PermissionDeniedPage = lazy(() => import('src/pages/dashboard/permission'));
// BLANK PAGE
const BlankPage = lazy(() => import('src/pages/dashboard/blank'));

// ----------------------------------------------------------------------

const SUPER_ADMIN_ROLES = ['super_admin'];
const ADMIN_PANEL_ROLES = ['super_admin', 'admin'];

function DashboardHomeRedirect() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return <LoadingScreen />;
  }

  return <Navigate to={getDefaultDashboardPath(user)} replace />;
}

function DashboardCmsRedirect() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return <LoadingScreen />;
  }

  const destination = isAdmin(user)
    ? paths.dashboard.cms.contactSubmissions.list
    : paths.dashboard.cms.pages.list;

  return <Navigate to={destination} replace />;
}

export const dashboardRoutes = [
  {
    path: 'dashboard',
    element: (
      <AuthGuard>
        <DashboardLayout>
          <Suspense fallback={<LoadingScreen />}>
            <Outlet />
          </Suspense>
        </DashboardLayout>
      </AuthGuard>
    ),
    children: [
      { element: <DashboardHomeRedirect />, index: true },
      {
        path: 'ecommerce',
        element: (
          <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
            <OverviewEcommercePage />
          </DashboardRoleGuard>
        ),
      },
      {
        path: 'analytics',
        element: (
          <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
            <OverviewAnalyticsPage />
          </DashboardRoleGuard>
        ),
      },
      {
        path: 'banking',
        element: (
          <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
            <OverviewBankingPage />
          </DashboardRoleGuard>
        ),
      },
      {
        path: 'booking',
        element: (
          <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
            <OverviewBookingPage />
          </DashboardRoleGuard>
        ),
      },
      {
        path: 'file',
        element: (
          <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
            <OverviewFilePage />
          </DashboardRoleGuard>
        ),
      },
      {
        path: 'user',
        element: (
          <DashboardRoleGuard roles={ADMIN_PANEL_ROLES}>
            <Outlet />
          </DashboardRoleGuard>
        ),
        children: [
          { element: <UserProfilePage />, index: true },
          { path: 'profile', element: <UserProfilePage /> },
          { path: 'cards', element: <UserCardsPage /> },
          { path: 'list', element: <UserListPage /> },
          { path: 'new', element: <UserCreatePage /> },
          { path: ':id/edit', element: <UserEditPage /> },
          { path: 'account', element: <UserAccountPage /> },
        ],
      },
      {
        path: 'admins',
        element: (
          <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
            <Outlet />
          </DashboardRoleGuard>
        ),
        children: [
          { index: true, element: <AdminListPage /> },
          { path: 'list', element: <AdminListPage /> },
          { path: 'new', element: <AdminCreatePage /> },
          { path: ':id/edit', element: <AdminEditPage /> },
        ],
      },
      {
        path: 'product',
        element: (
          <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
            <Outlet />
          </DashboardRoleGuard>
        ),
        children: [
          { element: <ProductListPage />, index: true },
          { path: 'list', element: <ProductListPage /> },
          { path: ':id', element: <ProductDetailsPage /> },
          { path: 'new', element: <ProductCreatePage /> },
          { path: ':id/edit', element: <ProductEditPage /> },
        ],
      },
      {
        path: 'category',
        element: (
          <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
            <Outlet />
          </DashboardRoleGuard>
        ),
        children: [
          { element: <CategoryListPage />, index: true },
          { path: 'list', element: <CategoryListPage /> },
          { path: 'new', element: <CategoryCreatePage /> },
          { path: ':id/edit', element: <CategoryEditPage /> },
        ],
      },
      {
        path: 'parent-category',
        element: (
          <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
            <Outlet />
          </DashboardRoleGuard>
        ),
        children: [
          { element: <ParentCategoryListPage />, index: true },
          { path: 'list', element: <ParentCategoryListPage /> },
          { path: 'new', element: <ParentCategoryCreatePage /> },
          { path: ':id/edit', element: <ParentCategoryEditPage /> },
        ],
      },
      {
        path: 'order',
        element: (
          <DashboardRoleGuard roles={ADMIN_PANEL_ROLES}>
            <Outlet />
          </DashboardRoleGuard>
        ),
        children: [
          { element: <OrderListPage />, index: true },
          { path: 'list', element: <OrderListPage /> },
          { path: ':id', element: <OrderDetailsPage /> },
        ],
      },
      {
        path: 'invoice',
        element: (
          <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
            <Outlet />
          </DashboardRoleGuard>
        ),
        children: [
          { element: <InvoiceListPage />, index: true },
          { path: 'list', element: <InvoiceListPage /> },
          { path: ':id', element: <InvoiceDetailsPage /> },
          { path: ':id/edit', element: <InvoiceEditPage /> },
          { path: 'new', element: <InvoiceCreatePage /> },
        ],
      },
      {
        path: 'post',
        element: (
          <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
            <Outlet />
          </DashboardRoleGuard>
        ),
        children: [
          { element: <BlogPostsPage />, index: true },
          { path: 'list', element: <BlogPostsPage /> },
          { path: ':title', element: <BlogPostPage /> },
          { path: ':title/edit', element: <BlogEditPostPage /> },
          { path: 'new', element: <BlogNewPostPage /> },
        ],
      },
      {
        path: 'job',
        element: (
          <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
            <Outlet />
          </DashboardRoleGuard>
        ),
        children: [
          { element: <JobListPage />, index: true },
          { path: 'list', element: <JobListPage /> },
          { path: ':id', element: <JobDetailsPage /> },
          { path: 'new', element: <JobCreatePage /> },
          { path: ':id/edit', element: <JobEditPage /> },
        ],
      },
      {
        path: 'tour',
        element: (
          <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
            <Outlet />
          </DashboardRoleGuard>
        ),
        children: [
          { element: <TourListPage />, index: true },
          { path: 'list', element: <TourListPage /> },
          { path: ':id', element: <TourDetailsPage /> },
          { path: 'new', element: <TourCreatePage /> },
          { path: ':id/edit', element: <TourEditPage /> },
        ],
      },
      {
        path: 'cms',
        children: [
          { index: true, element: <DashboardCmsRedirect /> },
          {
            path: 'about-us',
            element: (
              <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
                <CMSAboutPage />
              </DashboardRoleGuard>
            ),
          },
          {
            path: 'coming-soon',
            element: (
              <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
                <CMSComingSoonPage />
              </DashboardRoleGuard>
            ),
          },

          {
            path: 'premium',
            element: (
              <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
                <CMSPremiumPage />
              </DashboardRoleGuard>
            ),
          },
          {
            path: 'pages',
            element: (
              <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
                <Outlet />
              </DashboardRoleGuard>
            ),
            children: [
              { element: <CMSPagesListPage />, index: true },
              { path: 'list', element: <CMSPagesListPage /> },
              { path: 'new', element: <CMSPageCreatePage /> },
              { path: ':id', element: <CMSPageDetailsPage /> },
              { path: ':id/edit', element: <CMSPageEditPage /> },
            ],
          },
          {
            path: 'media',
            element: (
              <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
                <Outlet />
              </DashboardRoleGuard>
            ),
            children: [
              { element: <CMSMediaListPage />, index: true },
              { path: 'list', element: <CMSMediaListPage /> },
            ],
          },
          {
            path: 'navigation',
            element: (
              <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
                <CMSNavigationPage />
              </DashboardRoleGuard>
            ),
          },
          {
            path: 'settings',
            element: (
              <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
                <CMSSettingsPage />
              </DashboardRoleGuard>
            ),
          },
          {
            path: 'contactSubmissions',
            element: (
              <DashboardRoleGuard roles={ADMIN_PANEL_ROLES}>
                <Outlet />
              </DashboardRoleGuard>
            ),
            children: [
              { element: <CMSContactSubmissionsPage />, index: true },
              { path: 'list', element: <CMSContactSubmissionsPage /> },
              { path: ':id/edit', element: <ConatactUsEditPage /> },
            ],
          },
        ],
      },
      {
        path: 'file-manager',
        element: (
          <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
            <FileManagerPage />
          </DashboardRoleGuard>
        ),
      },
      {
        path: 'mail',
        element: (
          <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
            <MailPage />
          </DashboardRoleGuard>
        ),
      },
      {
        path: 'chat',
        element: (
          <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
            <ChatPage />
          </DashboardRoleGuard>
        ),
      },
      {
        path: 'calendar',
        element: (
          <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
            <CalendarPage />
          </DashboardRoleGuard>
        ),
      },
      {
        path: 'kanban',
        element: (
          <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
            <KanbanPage />
          </DashboardRoleGuard>
        ),
      },
      {
        path: 'permission',
        element: (
          <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
            <PermissionDeniedPage />
          </DashboardRoleGuard>
        ),
      },
      {
        path: 'blank',
        element: (
          <DashboardRoleGuard roles={SUPER_ADMIN_ROLES}>
            <BlankPage />
          </DashboardRoleGuard>
        ),
      },
    ],
  },
];
