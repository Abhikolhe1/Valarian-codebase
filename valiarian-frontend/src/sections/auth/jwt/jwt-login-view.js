import { yupResolver } from '@hookform/resolvers/yup';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
// routes
import { useRouter, useSearchParams } from 'src/routes/hook';
// auth
import { useAuthContext } from 'src/auth/hooks';
// utils
import { resolveAuthRedirect } from 'src/utils/auth-redirect';
// components
import { Button } from '@mui/material';
import FormProvider, { RHFTextField } from 'src/components/hook-form';
import { RouterLink } from 'src/routes/components';
import GoogleLoginButton from './google-login-button';



// ----------------------------------------------------------------------

export default function JwtLoginView() {
  const { sendOtp, verifyOtp } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [errorMsg, setErrorMsg] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [phone, setPhone] = useState('');
  const [otpId, setOtpId] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Refs for OTP inputs
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const IdentifierSchema = Yup.object().shape({
    phone: Yup.string()
      .required('Mobile number is required')
      .matches(/^[0-9]{10}$/, 'Must be a valid 10-digit mobile number'),
  });

  const methods = useForm({
    resolver: yupResolver(IdentifierSchema),
    defaultValues: {
      phone: '',
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmitIdentifier = handleSubmit(async (data) => {
    try {
      setErrorMsg('');
      const phoneNumber = data.phone;

      setPhone(phoneNumber);

      // Send OTP using auth context
      const result = await sendOtp(phoneNumber, 'phone');

      setOtpId(result.otpId);
      setOtpSent(true);

      // Focus first OTP input
      setTimeout(() => {
        otpRefs[0].current?.focus();
      }, 100);
    } catch (error) {
      console.error(error);
      setErrorMsg(typeof error === 'string' ? error : error?.error?.message || 'Failed to send OTP');
    }
  });

  const handleOtpChange = (index, value) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');

    if (numericValue.length <= 1) {
      const newOtp = [...otp];
      newOtp[index] = numericValue;
      setOtp(newOtp);
      setOtpError('');

      // Auto-focus next input
      if (numericValue && index < 3) {
        otpRefs[index + 1].current?.focus();
      }

      // Auto-verify when all 4 digits entered
      if (index === 3 && numericValue) {
        const fullOtp = [...newOtp.slice(0, 3), numericValue].join('');
        if (fullOtp.length === 4) {
          handleVerifyOtp(fullOtp);
        }
      }
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 4);

    if (pastedData.length === 4) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      otpRefs[3].current?.focus();
      handleVerifyOtp(pastedData);
    }
  };

  const handleVerifyOtp = async (otpValue = otp.join('')) => {
    try {
      setIsVerifying(true);
      setOtpError('');

      if (otpValue.length !== 4) {
        setOtpError('Please enter a valid 4-digit OTP');
        setIsVerifying(false);
        return;
      }

      // Verify OTP and login using auth context
      const result = await verifyOtp(otpId, otpValue, phone);

      console.log('User authenticated successfully:', result.user);

      // Show welcome message for new users
      if (result.isNewUser) {
        console.log('Welcome! Your account has been created. Complete your profile to add email.');
      }

      router.replace(resolveAuthRedirect(searchParams));
    } catch (error) {
      console.error('OTP verification error:', error);
      setOtpError(typeof error === 'string' ? error : error?.error?.message || 'Invalid OTP');
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setOtpError('');
      setOtp(['', '', '', '']);

      // Resend OTP using auth context
      const result = await sendOtp(phone, 'phone');

      setOtpId(result.otpId);
      otpRefs[0].current?.focus();
    } catch (error) {
      console.error(error);
      setOtpError(typeof error === 'string' ? error : error?.error?.message || 'Failed to resend OTP');
    }
  };

  const handleChangeNumber = () => {
    setOtpSent(false);
    setOtp(['', '', '', '']);
    setOtpError('');
    setPhone('');
    setOtpId('');
  };

  const renderHead = (
    <Stack spacing={2} sx={{ mb: 5 }}>
      <Box sx={{ display: "flex", justifyContent: { xs: "center", md: "flex-start" } }}>
        <Typography variant="h4" >Sign in to Valiarian</Typography>
      </Box>
      {otpSent && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Enter the 4-digit OTP sent to +91 {phone}
        </Typography>
      )}
    </Stack>
  );

  const renderForm = (
    <Stack spacing={3}>
      {!!errorMsg && <Alert severity="error">{errorMsg}</Alert>}

      <GoogleLoginButton />
      <Link component={RouterLink} href="/" sx={{ display: 'contents' }}>
        <Button fullWidth size="large" color='secondary' variant="outlined"> Login As Guest</Button>
      </Link>

      <Divider sx={{ my: 1 }}>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          OR
        </Typography>
      </Divider>

      <Box>

        {!otpSent && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            Enter your mobile number to continue
          </Typography>
        )}
        <RHFTextField
          name="phone"
          label="Mobile Number"
          placeholder="Enter 10-digit mobile number"
          inputProps={{
            maxLength: 10,
          }}
          InputProps={{
            endAdornment: (
              <LoadingButton
                color="secondary"
                variant="contained"
                onClick={handleSubmit(onSubmitIdentifier)}
                loading={isSubmitting}
                disabled={otpSent}
                sx={{
                  minWidth: 100,
                  height: 40,
                }}
              >
                {otpSent ? 'Sent' : 'Send OTP'}
              </LoadingButton>
            ),
          }}
        />
        {!otpSent && (
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
            We&apos;ll send you an OTP to verify
          </Typography>
        )}
      </Box>


      {otpSent && (
        <>
          {!!otpError && <Alert severity="error">{otpError}</Alert>}

          <Alert severity="info">
            For testing, use OTP: <strong>1234</strong>
          </Alert>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, textAlign: 'center' }}>
              Enter OTP sent to +91 {phone}
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              {otp.map((digit, index) => (
                <TextField
                  key={index}
                  inputRef={otpRefs[index]}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={index === 0 ? handleOtpPaste : undefined}
                  inputProps={{
                    maxLength: 1,
                    style: {
                      textAlign: 'center',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      padding: '16px',
                    },
                  }}
                  sx={{
                    width: 64,
                    '& input': {
                      padding: '16px 0',
                    },
                  }}
                />
              ))}
            </Stack>
          </Box>

          <LoadingButton
            fullWidth
            color="inherit"
            size="large"
            variant="contained"
            type="button"
            onClick={() => handleVerifyOtp()}
            loading={isVerifying}
            disabled={otp.join('').length !== 4}
          >
            Verify & Login
          </LoadingButton>

          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Didn&apos;t receive OTP?
            </Typography>
            <Link
              component="button"
              type="button"
              variant="subtitle2"
              onClick={handleResendOtp}
              sx={{ cursor: 'pointer' }}
            >
              Resend OTP
            </Link>
          </Stack>

          <Link
            component="button"
            type="button"
            variant="body2"
            onClick={handleChangeNumber}
            sx={{ cursor: 'pointer', textAlign: 'center' }}
          >
            Change mobile number
          </Link>
        </>
      )}

      {!otpSent && (
        <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Typography>
      )}
    </Stack>
  );

  return (
    <FormProvider methods={methods} onSubmit={onSubmitIdentifier}>
      {renderHead}
      {renderForm}
    </FormProvider>
  );
}
