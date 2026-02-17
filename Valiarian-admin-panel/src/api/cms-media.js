import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';
// utils
import axios, { endpoints, fetcher } from 'src/utils/axios';

// ----------------------------------------------------------------------

const URL = endpoints.cms.media.list;

const options = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------

export function useGetMedia(params) {
  const { data, isLoading, error, isValidating } = useSWR(
    params ? [URL, { params }] : URL,
    fetcher,
    options
  );

  const memoizedValue = useMemo(
    () => ({
      media: data?.media || [],
      mediaLoading: isLoading,
      mediaError: error,
      mediaValidating: isValidating,
      mediaEmpty: !isLoading && !data?.media?.length,
    }),
    [data?.media, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export async function uploadMedia(formData, onUploadProgress) {
  const res = await axios.post(endpoints.cms.media.upload, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });

  mutate(URL);

  return res.data;
}

// ----------------------------------------------------------------------

export async function updateMedia(mediaId, mediaData) {
  const res = await axios.put(endpoints.cms.media.details(mediaId), mediaData);

  mutate(URL);
  mutate(endpoints.cms.media.details(mediaId));

  return res.data;
}

// ----------------------------------------------------------------------

export async function deleteMedia(mediaId) {
  await axios.delete(endpoints.cms.media.details(mediaId));

  mutate(URL);
}
