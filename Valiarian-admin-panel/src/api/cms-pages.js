import { useMemo } from 'react';
import useSWR from 'swr';
// utils
import { endpoints, fetcher } from 'src/utils/axios';

// ----------------------------------------------------------------------

const URL = endpoints.cms.pages.list;

const options = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------

export function useGetPages(params) {
  const { data, isLoading, error, isValidating } = useSWR(
    params ? [URL, { params }] : URL,
    fetcher,
    options
  );

  const memoizedValue = useMemo(
    () => {
      const normalizedPages = Array.isArray(data) ? data : data?.pages || [];

      return {
        pages: normalizedPages,
        pagesLoading: isLoading,
        pagesError: error,
        pagesValidating: isValidating,
        pagesEmpty: !isLoading && !normalizedPages.length,
      };
    },
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useGetPage(pageId) {
  const URL_DETAILS = pageId ? endpoints.cms.pages.details(pageId) : null;

  const { data, isLoading, error, isValidating, mutate } = useSWR(URL_DETAILS, fetcher, options);

  const memoizedValue = useMemo(
    () => ({
      page: data,
      pageLoading: isLoading,
      pageError: error,
      pageValidating: isValidating,
      pageMutate: mutate,
    }),
    [data, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useGetPageVersions(pageId) {
  const URL_VERSIONS = pageId ? endpoints.cms.pages.versions(pageId) : null;

  const { data, isLoading, error, isValidating } = useSWR(URL_VERSIONS, fetcher, options);

  const memoizedValue = useMemo(
    () => ({
      versions: data?.versions || [],
      versionsLoading: isLoading,
      versionsError: error,
      versionsValidating: isValidating,
    }),
    [data?.versions, error, isLoading, isValidating]
  );

  return memoizedValue;
}
