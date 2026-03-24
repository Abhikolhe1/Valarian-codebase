import axiosInstance from 'src/utils/axios';
import useSWR from 'swr';

const fetcher = (url) => axiosInstance.get(url).then((res) => res.data);
const getErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallbackMessage;

// GET all addresses for current user
export function useGetAddresses(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR(enabled ? '/api/addresses' : null, fetcher);

  return {
    addresses: data || [],
    isLoading,
    error,
    mutate,
  };
}

// GET single address by ID
export function useGetAddress(id) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/addresses/${id}` : null,
    fetcher
  );

  return {
    address: data,
    isLoading,
    error,
    mutate,
  };
}

// POST - Create new address
export async function createAddress(addressData) {
  try {
    const response = await axiosInstance.post('/api/addresses', addressData);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to create address'));
  }
}

// PATCH - Update address
export async function updateAddress(id, addressData) {
  try {
    const response = await axiosInstance.patch(`/api/addresses/${id}`, addressData);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to update address'));
  }
}

// PATCH - Set address as primary
export async function setPrimaryAddress(id) {
  try {
    const response = await axiosInstance.patch(`/api/addresses/${id}/set-primary`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to set primary address'));
  }
}

// DELETE - Delete address
export async function deleteAddress(id) {
  try {
    const response = await axiosInstance.delete(`/api/addresses/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to delete address'));
  }
}
