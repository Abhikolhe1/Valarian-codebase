import {useMemo} from 'react';
import useSWR, {mutate as globalMutate} from 'swr';
// utils
import axiosInstance, {endpoints, fetcher} from 'src/utils/axios';

// ----------------------------------------------------------------------

export function useGetContactSubmissions(params) {
  const query = new URLSearchParams();

  if (params?.page) query.set('page', params.page);
  if (params?.limit) query.set('limit', params.limit);
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.search) query.set('search', params.search);

  const queryString = query.toString();
  const url = queryString
    ? `${endpoints.cms.contactSubmissions.list}?${queryString}`
    : endpoints.cms.contactSubmissions.list;

  const {data, isLoading, error, isValidating, mutate: submissionsMutate} = useSWR(url, fetcher, {
    revalidateIfStale: true,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 10000,
    refreshWhenHidden: false,
    dedupingInterval: 2000,
  });

  return useMemo(
    () => ({
      submissions: data?.data || [],
      total: data?.total || 0,
      page: data?.page || params?.page || 1,
      limit: data?.limit || params?.limit || 10,
      submissionsLoading: isLoading,
      submissionsError: error,
      submissionsValidating: isValidating,
      submissionsMutate,
    }),
    [data, error, isLoading, isValidating, submissionsMutate, params?.limit, params?.page]
  );
}

export function useGetContactSubmission(id) {
  const url = id ? endpoints.cms.contactSubmissions.details(id) : null;

  const {data, isLoading, error, isValidating, mutate: submissionMutate} = useSWR(url, fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return useMemo(
    () => ({
      submission: data,
      submissionLoading: isLoading,
      submissionError: error,
      submissionValidating: isValidating,
      submissionMutate,
    }),
    [data, error, isLoading, isValidating, submissionMutate]
  );
}

export async function sendContactSubmissionReply(id, payload) {
  const response = await axiosInstance.post(endpoints.cms.contactSubmissions.reply(id), payload);

  await globalMutate(endpoints.cms.contactSubmissions.details(id));
  await globalMutate((key) => typeof key === 'string' && key.startsWith(endpoints.cms.contactSubmissions.list));

  return response.data;
}
