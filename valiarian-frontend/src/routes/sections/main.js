import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
// auth
// layouts
import CompactLayout from 'src/layouts/compact';
import MainLayout from 'src/layouts/main';
import SimpleLayout from 'src/layouts/simple';
import AboutPage from 'src/pages/about-us';
import ContactPage from 'src/pages/contact-us';
import PremiumPage from 'src/pages/premium';
import ProductCheckoutPage from 'src/pages/product/checkout';
import ProductListPage from 'src/pages/product/list';
// components
import { SplashScreen } from 'src/components/loading-screen';
import { AuthGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const HomePage = lazy(() => import('src/pages/home'));
const Page500 = lazy(() => import('src/pages/500'));
const Page403 = lazy(() => import('src/pages/403'));
const Page404 = lazy(() => import('src/pages/404'));
const FaqsPage = lazy(() => import('src/pages/faqs'));
const PricingPage = lazy(() => import('src/pages/pricing'));
const PaymentPage = lazy(() => import('src/pages/payment'));
const PaymentSuccessPage = lazy(() => import('../../pages/payment-success'));
const PaymentFailedPage = lazy(() => import('../../pages/payment-failed'));
const PaymentCancelledPage = lazy(() => import('../../pages/payment-cancelled'));
const PaymentPendingPage = lazy(() => import('../../pages/payment-pending'));
const ComingSoonPage = lazy(() => import('src/pages/coming-soon'));
const MaintenancePage = lazy(() => import('src/pages/maintenance'));
// PRODUCT
const ProductDetailsPage = lazy(() => import('src/pages/product/details'));
// FAVORITES
const FavoritesPage = lazy(() => import('src/pages/favorites'));
// ORDERS
const OrderConfirmationPage = lazy(() => import('src/pages/order-confirmation'));
const OrderDetailsPage = lazy(() => import('src/pages/order-details'));
const OrderHistoryPage = lazy(() => import('src/pages/order-history'));
const OrderTrackingPage = lazy(() => import('src/pages/order-tracking'));
// USER
const UserProfilePage = lazy(() => import('src/pages/user/profile'));
// BLOG
const PostListPage = lazy(() => import('src/pages/post/list'));
const PostDetailsPage = lazy(() => import('src/pages/post/details'));

// ----------------------------------------------------------------------

export const mainRoutes = [
  {
    element: (
      <MainLayout>
        <Suspense fallback={<SplashScreen />}>
          <Outlet />
        </Suspense>
      </MainLayout>
    ),
    children: [
      { path: 'about-us', element: <AboutPage /> },
      { path: 'contact-us', element: <ContactPage /> },
      { path: 'faqs', element: <FaqsPage /> },
      { path: 'premium', element: <PremiumPage /> },
      {
        path: 'favorites',
        element: (
          <AuthGuard>
            <FavoritesPage />
          </AuthGuard>
        ),
      },
      {
        path: 'profile',
        element: (
          <AuthGuard>
            <UserProfilePage />
          </AuthGuard>
        ),
      },
      {
        path: 'orders',
        children: [
          {
            path: 'confirmation/:orderId',
            element: (
              <AuthGuard>
                <OrderConfirmationPage />
              </AuthGuard>
            ),
          },
          {
            path: 'history',
            element: (
              <AuthGuard>
                <OrderHistoryPage />
              </AuthGuard>
            ),
          },
          {
            path: ':id',
            element: (
              <AuthGuard>
                <OrderDetailsPage />
              </AuthGuard>
            ),
          },
          {
            path: ':id/tracking',
            element: (
              <AuthGuard>
                <OrderTrackingPage />
              </AuthGuard>
            ),
          },
        ],
      },
      {
        path: 'payment',
        children: [
          {
            path: 'success',
            element: (
              <AuthGuard>
                <PaymentSuccessPage />
              </AuthGuard>
            ),
          },
          {
            path: 'failed',
            element: (
              <AuthGuard>
                <PaymentFailedPage />
              </AuthGuard>
            ),
          },
          {
            path: 'cancelled',
            element: (
              <AuthGuard>
                <PaymentCancelledPage />
              </AuthGuard>
            ),
          },
          {
            path: 'pending',
            element: (
              <AuthGuard>
                <PaymentPendingPage />
              </AuthGuard>
            ),
          },
        ],
      },
      {
        path: 'products',
        children: [
          { element: <ProductListPage />, index: true },
          { path: 'list', element: <ProductListPage /> },
          { path: ':id', element: <ProductDetailsPage /> },
          {
            path: 'checkout',
            element: <ProductCheckoutPage />,
          },
        ],
      },
      {
        path: 'post',
        children: [
          { element: <PostListPage />, index: true },
          { path: 'list', element: <PostListPage /> },
          { path: ':title', element: <PostDetailsPage /> },
        ],
      },
    ],
  },
  {
    element: (
      <SimpleLayout>
        <Suspense fallback={<SplashScreen />}>
          <Outlet />
        </Suspense>
      </SimpleLayout>
    ),
    children: [
      { path: 'pricing', element: <PricingPage /> },
      { path: 'payment', element: <PaymentPage /> },
    ],
  },
  {
    element: (
      <CompactLayout>
        <Suspense fallback={<SplashScreen />}>
          <Outlet />
        </Suspense>
      </CompactLayout>
    ),
    children: [
      { path: 'coming-soon', element: <ComingSoonPage /> },
      { path: 'maintenance', element: <MaintenancePage /> },
      { path: '500', element: <Page500 /> },
      { path: '404', element: <Page404 /> },
      { path: '403', element: <Page403 /> },
    ],
  },
];
