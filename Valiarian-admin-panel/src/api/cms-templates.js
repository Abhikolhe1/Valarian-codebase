import { useMemo } from 'react';
import useSWR from 'swr';
// utils
import { endpoints, fetcher } from 'src/utils/axios';

// ----------------------------------------------------------------------

const URL = endpoints.cms.templates.list;

const options = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------

export function useGetTemplates(params) {
  const { data, isLoading, error, isValidating } = useSWR(
    params ? [URL, { params }] : URL,
    fetcher,
    options
  );

  const memoizedValue = useMemo(
    () => ({
      templates: data?.templates || [],
      templatesLoading: isLoading,
      templatesError: error,
      templatesValidating: isValidating,
      templatesEmpty: !isLoading && !data?.templates?.length,
    }),
    [data?.templates, error, isLoading, isValidating]
  );

  return memoizedValue;
}
