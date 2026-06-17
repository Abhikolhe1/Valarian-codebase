import { useMemo } from 'react';
import useSWR from 'swr';
import axios from 'axios';

const API_URL = process.env.REACT_APP_HOST_API || 'http://localhost:3035';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

const fetcher = (url) => axiosInstance.get(url).then((res) => res.data);

export function useGetAboutPage() {
  const { data, error, isLoading, isValidating } = useSWR('/api/about-page', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return useMemo(
    () => ({
      aboutPage: data,
      aboutPageLoading: isLoading,
      aboutPageError: error,
      aboutPageValidating: isValidating,
    }),
    [data, error, isLoading, isValidating]
  );
}
