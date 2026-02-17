import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';
// utils
import axios, { endpoints, fetcher } from 'src/utils/axios';

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
    () => ({
      pages: data?.pages || [],
      pagesLoading: isLoading,
      pagesError: error,
      pagesValidating: isValidating,
      pagesEmpty: !isLoading && !data?.pages?.length,
    }),
    [data?.pages, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useGetPage(pageId) {
  const URL_DETAILS = pageId ? endpoints.cms.pages.details(pageId) : null;

  const { data, isLoading, error, isValidating } = useSWR(URL_DETAILS, fetcher, options);

  const memoizedValue = useMemo(
    () => ({
      page: data,
      pageLoading: isLoading,
      pageError: error,
      pageValidating: isValidating,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export async function createPage(pageData) {
  const res = await axios.post(URL, pageData);

  mutate(URL);

  return res.data;
}

// ----------------------------------------------------------------------

export async function updatePage(pageId, pageData) {
  const res = await axios.patch(endpoints.cms.pages.details(pageId), pageData);

  mutate(URL);
  mutate(endpoints.cms.pages.details(pageId));

  return res.data;
}

// ----------------------------------------------------------------------

export async function deletePage(pageId) {
  await axios.delete(endpoints.cms.pages.details(pageId));

  mutate(URL);
}

// ----------------------------------------------------------------------

export async function publishPage(pageId) {
  const res = await axios.post(endpoints.cms.pages.publish(pageId));

  mutate(URL);
  mutate(endpoints.cms.pages.details(pageId));

  return res.data;
}

// ----------------------------------------------------------------------

export async function duplicatePage(pageId, newTitle) {
  const res = await axios.post(endpoints.cms.pages.duplicate(pageId), { newTitle });

  mutate(URL);

  return res.data;
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

// ----------------------------------------------------------------------

export async function revertToVersion(pageId, versionId) {
  const res = await axios.post(endpoints.cms.pages.revert(pageId, versionId));

  mutate(URL);
  mutate(endpoints.cms.pages.details(pageId));
  mutate(endpoints.cms.pages.versions(pageId));

  return res.data;
}
