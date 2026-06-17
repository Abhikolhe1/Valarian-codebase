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
  let swrKey = URL;

  if (params === null) {
    swrKey = null;
  } else if (params) {
    swrKey = [URL, { params }];
  }

  const { data, isLoading, error, isValidating } = useSWR(
    swrKey,
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
