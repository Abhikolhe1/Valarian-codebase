import axiosInstance from 'src/utils/axios';

const getErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallbackMessage;

// GET - Check whether a pincode is serviceable by the courier, optionally
// narrowed to a payment method (COD needs cash-collection support too).
export async function checkPincodeServiceability(pincode, paymentMethod) {
  try {
    const response = await axiosInstance.get('/api/shipping/serviceability', {
      params: paymentMethod ? { pincode, paymentMethod } : { pincode },
    });
    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, 'Unable to verify delivery availability for this pincode')
    );
  }
}
