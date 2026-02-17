import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';
// utils
import axios, { endpoints, fetcher } from 'src/utils/axios';

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

// ----------------------------------------------------------------------

export async function createSection(sectionData) {
  const res = await axios.post(URL, sectionData);

  mutate(URL);

  return res.data;
}

// ----------------------------------------------------------------------

export async function updateSection(sectionId, sectionData) {
  const res = await axios.patch(endpoints.cms.sections.details(sectionId), sectionData);

  mutate(URL);
  mutate(endpoints.cms.sections.details(sectionId));

  return res.data;
}

// ----------------------------------------------------------------------

export async function deleteSection(sectionId) {
  await axios.delete(endpoints.cms.sections.details(sectionId));

  mutate(URL);
}

// ----------------------------------------------------------------------

export async function reorderSections(pageId, sectionIds) {
  const res = await axios.patch(endpoints.cms.sections.reorder, {
    pageId,
    sectionIds,
  });

  mutate(URL);

  return res.data;
}
