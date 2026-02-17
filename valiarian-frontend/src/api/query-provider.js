import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import PropTypes from 'prop-types';

// ----------------------------------------------------------------------

// Create a client with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global defaults for all queries
      retry: 1, // Retry failed requests once
      refetchOnWindowFocus: false, // Don't refetch on window focus by default
      refetchOnReconnect: true, // Refetch on reconnect
      staleTime: 5 * 60 * 1000, // 5 minutes default stale time
      cacheTime: 10 * 60 * 1000, // 10 minutes default cache time
      onError: (error) => {
        console.error('Query error:', error);
      },
    },
    mutations: {
      // Global defaults for all mutations
      retry: 0, // Don't retry mutations
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

// ----------------------------------------------------------------------

export { queryClient };

// ----------------------------------------------------------------------

/**
 * React Query Provider Component
 * Wraps the app to provide React Query functionality
 */
export default function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Add devtools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
      )}
    </QueryClientProvider>
  );
}

QueryProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
