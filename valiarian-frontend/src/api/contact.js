import axiosInstance, {endpoints} from 'src/utils/axios';

export async function createContactSubmission(payload) {
  const response = await axiosInstance.post(endpoints.contact.create, payload);
  return response.data;
}
