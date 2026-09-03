import axiosInstance from 'src/utils/axios';

const getErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallbackMessage;

// GET - Check whether a pincode is serviceable by the courier, optionally
// narrowed to a payment method (COD needs cash-collection support too).
export async function checkPincodeServiceability(pincode, paymentMethod) {
  const params = paymentMethod ? { pincode, paymentMethod } : { pincode };
  const requestServiceability = async () => {
    const response = await axiosInstance.get('/api/shipping/serviceability', {
      params,
    });
    return response.data;
  };

  try {
    return await requestServiceability();
  } catch (firstError) {
    const status = firstError?.response?.status;
    if (!status || status >= 500) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        return await requestServiceability();
      } catch (retryError) {
        throw new Error(
          getErrorMessage(retryError, 'Unable to verify delivery availability for this pincode')
        );
      }
    }

    throw new Error(
      getErrorMessage(firstError, 'Unable to verify delivery availability for this pincode')
    );
  }
}
