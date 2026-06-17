import { useMemo } from 'react';
import useSWR from 'swr';
// utils
import { endpoints, fetcher } from 'src/utils/axios';

// ----------------------------------------------------------------------

const URL = endpoints.cms.media.list;
const FOLDERS_URL = endpoints.cms.media.folders;

const options = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------

export function useGetMedia(params, shouldFetch = true) {
  // Build the SWR key - null means don't fetch
  // Clean params: remove empty string values
  const cleanParams = params ? Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== '' && value != null)
  ) : null;

  let swrKey = null;
  if (shouldFetch) {
    swrKey = cleanParams && Object.keys(cleanParams).length > 0
      ? [URL, { params: cleanParams }]
      : URL;
  }

  const { data, isLoading, error, isValidating, mutate } = useSWR(
    swrKey,
    fetcher,
    options
  );

  const memoizedValue = useMemo(
    () => ({
      media: data?.data || [],
      mediaLoading: isLoading,
      mediaError: error,
      mediaValidating: isValidating,
      mediaEmpty: !isLoading && !data?.data?.length,
      mediaMutate: mutate,
    }),
    [data?.data, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useGetMediaFolders() {
  const { data, isLoading, error, isValidating, mutate } = useSWR(
    FOLDERS_URL,
    fetcher,
    options
  );

  const memoizedValue = useMemo(
    () => ({
      folders: data?.folders || [],
      foldersLoading: isLoading,
      foldersError: error,
      foldersValidating: isValidating,
      foldersEmpty: !isLoading && !data?.folders?.length,
      foldersMutate: mutate,
    }),
    [data?.folders, error, isLoading, isValidating, mutate]
  );

  return memoizedValue;
}
