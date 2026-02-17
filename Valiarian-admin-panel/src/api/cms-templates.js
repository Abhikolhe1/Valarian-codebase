import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';
// utils
import axios, { endpoints, fetcher } from 'src/utils/axios';

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

// ----------------------------------------------------------------------

export async function createTemplate(templateData) {
  const res = await axios.post(URL, templateData);

  mutate(URL);

  return res.data;
}

// ----------------------------------------------------------------------

export async function deleteTemplate(templateId) {
  await axios.delete(endpoints.cms.templates.details(templateId));

  mutate(URL);
}
