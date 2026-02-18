import { useMemo } from 'react';
import useSWR from 'swr';
// utils
import { endpoints, fetcher } from 'src/utils/axios';

// ----------------------------------------------------------------------

const URL = endpoints.cms.sections.list;

const options = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------

export function useGetSections(params) {
  const { data, isLoading, error, isValidating } = useSWR(
    params ? [URL, { params }] : URL,
    fetcher,
    options
  );

  const memoizedValue = useMemo(
    () => ({
      sections: data?.sections || [],
      sectionsLoading: isLoading,
      sectionsError: error,
      sectionsValidating: isValidating,
      sectionsEmpty: !isLoading && !data?.sections?.length,
    }),
    [data?.sections, error, isLoading, isValidating]
  );

  return memoizedValue;
}
