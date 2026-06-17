import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import axiosInstance, { endpoints, fetcher } from 'src/utils/axios';

export const getProductReviewsKey = (productId) =>
  productId ? endpoints.reviews.byProduct(productId) : null;

export function useGetProductReviews(productId) {
  const URL = getProductReviewsKey(productId);

  const { data, isLoading, error, isValidating } = useSWR(URL, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return useMemo(
    () => ({
      reviews: data?.reviews || [],
      stats: data?.stats || { averageRating: 0, totalReviews: 0, breakdown: [] },
      eligibility: data?.eligibility || {
        canWriteReview: false,
        canEditReview: false,
        myReviewId: null,
      },
      reviewsLoading: isLoading,
      reviewsError: error,
      reviewsValidating: isValidating,
    }),
    [data, error, isLoading, isValidating]
  );
}

export async function uploadReviewImages(files = []) {
  if (!files.length) {
    return [];
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append('file', file);
  });

  const response = await axiosInstance.post(endpoints.upload.root, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data?.files?.map((file) => file.fileUrl).filter(Boolean) || [];
}

export async function createReview(payload) {
  const response = await axiosInstance.post(endpoints.reviews.create, payload);
  return response.data;
}

export async function updateReview(id, payload) {
  const response = await axiosInstance.put(endpoints.reviews.details(id), payload);
  return response.data;
}

export async function deleteReview(id) {
  const response = await axiosInstance.delete(endpoints.reviews.details(id));
  return response.data;
}

export async function refreshProductReviews(productId) {
  const key = getProductReviewsKey(productId);
  if (!key) {
    return undefined;
  }

  return mutate(key);
}
