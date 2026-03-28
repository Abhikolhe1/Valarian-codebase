import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import axiosInstance, { endpoints, fetcher } from 'src/utils/axios';

export const getAdminProductReviewsKey = (productId) =>
  productId ? endpoints.reviews.adminByProduct(productId) : null;

export function useGetAdminProductReviews(productId) {
  const URL = getAdminProductReviewsKey(productId);

  const { data, isLoading, error, isValidating } = useSWR(URL, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return useMemo(
    () => ({
      reviews: data?.reviews || [],
      stats: data?.stats || { averageRating: 0, totalReviews: 0, breakdown: [] },
      reviewsLoading: isLoading,
      reviewsError: error,
      reviewsValidating: isValidating,
    }),
    [data, error, isLoading, isValidating]
  );
}

export async function toggleAdminReviewHidden(id, isHidden, hiddenReason = '') {
  const response = await axiosInstance.patch(endpoints.reviews.adminHide(id), {
    isHidden,
    hiddenReason,
  });
  return response.data;
}

export async function deleteReview(id) {
  const response = await axiosInstance.delete(endpoints.reviews.details(id));
  return response.data;
}

export async function refreshAdminProductReviews(productId) {
  const key = getAdminProductReviewsKey(productId);
  if (!key) {
    return undefined;
  }

  return mutate(key);
}
