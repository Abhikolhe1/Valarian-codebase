import axiosInstance from 'src/utils/axios';
import { checkPincodeServiceability } from './shipping';

jest.mock('src/utils/axios', () => ({ __esModule: true, default: { get: jest.fn() } }));

beforeEach(() => jest.resetAllMocks());

it('returns eligibility for a postal-verified PIN even when Blue Dart is unavailable', async () => {
  const data = { checkoutAllowed: true, isServiceable: false };
  axiosInstance.get.mockResolvedValue({ data });
  expect(await checkPincodeServiceability('400001')).toEqual(data);
});

it('preserves the nested backend invalid postal PIN message', async () => {
  axiosInstance.get.mockRejectedValue({ error: { message: 'PIN code 678956 was not found in the Indian postal directory.' } });
  await expect(checkPincodeServiceability('678956')).rejects.toThrow('PIN code 678956 was not found');
});

it('preserves the distinct postal-directory outage message', async () => {
  axiosInstance.get.mockRejectedValue({ error: { message: 'We could not verify this PIN code with the postal directory. Please try again shortly.' } });
  await expect(checkPincodeServiceability('400001')).rejects.toThrow('Please try again shortly');
});
