import axiosInstance, { endpoints } from 'src/utils/axios';

export async function getUsers(params = {}) {
  const response = await axiosInstance.get(endpoints.auth.userList, { params });
  return response.data;
}

export async function updateUserStatus(id, isActive) {
  const response = await axiosInstance.patch(endpoints.auth.userStatus(id), { isActive });
  return response.data;
}
