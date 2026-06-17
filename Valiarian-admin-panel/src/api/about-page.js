import { useMemo } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import axiosInstance, { endpoints, fetcher } from 'src/utils/axios';

const URL = endpoints.cms.aboutPage.get;

const options = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

export function useGetAboutPage() {
  const { data, isLoading, error, isValidating, mutate } = useSWR(URL, fetcher, options);

  return useMemo(
    () => ({
      aboutPage: data,
      aboutPageLoading: isLoading,
      aboutPageError: error,
      aboutPageValidating: isValidating,
      aboutPageMutate: mutate,
    }),
    [data, error, isLoading, isValidating, mutate]
  );
}

export async function updateAboutPage(payload) {
  const response = await axiosInstance.put(endpoints.cms.aboutPage.update, payload);
  await globalMutate(URL);
  return response.data;
}
