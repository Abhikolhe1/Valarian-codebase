import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import LoadingButton from '@mui/lab/LoadingButton';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAuthContext } from 'src/auth/hooks';
import { useSnackbar } from 'src/components/snackbar';
import axiosInstance from 'src/utils/axios';

export default function CheckoutEmailVerificationDialog({
  open,
  onClose,
  initialEmail,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const { refreshUser } = useAuthContext();
  const [email, setEmail] = useState(initialEmail || '');
  const [otpStep, setOtpStep] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    if (open) {
      setEmail(initialEmail || '');
      setOtpStep(false);
      setNewEmail('');
      setOtp(['', '', '', '']);
      setError('');
    }
  }, [initialEmail, open]);

  const handleSendOtp = async () => {
    try {
      setIsSendingOtp(true);
      setError('');

      if (!email || !email.includes('@')) {
        setError('Please enter a valid email address');
        return;
      }

      const response = await axiosInstance.post('/api/users/profile/email/send-otp', {
        newEmail: email.trim(),
      });

      setNewEmail(email.trim());
      setOtpStep(true);
      setOtp(['', '', '', '']);

      enqueueSnackbar(response.data.message || 'OTP sent to your email', {
        variant: 'success',
      });

      setTimeout(() => {
        otpRefs[0].current?.focus();
      }, 100);
    } catch (otpError) {
      setError(
        otpError?.response?.data?.error?.message ||
          otpError?.response?.data?.message ||
          otpError?.message ||
          'Failed to send OTP'
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const numericValue = value.replace(/[^0-9]/g, '');

    if (numericValue.length <= 1) {
      const nextOtp = [...otp];
      nextOtp[index] = numericValue;
      setOtp(nextOtp);
      setError('');

      if (numericValue && index < 3) {
        otpRefs[index + 1].current?.focus();
      }
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleOtpPaste = (event) => {
    event.preventDefault();
    const pastedData = event.clipboardData
      .getData('text')
      .replace(/[^0-9]/g, '')
      .slice(0, 4);

    if (pastedData.length === 4) {
      const nextOtp = pastedData.split('');
      setOtp(nextOtp);
      setError('');
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const otpValue = otp.join('');

      if (otpValue.length !== 4) {
        setError('Please enter the 4-digit OTP');
        return;
      }

      setIsVerifyingOtp(true);
      setError('');

      const response = await axiosInstance.patch('/api/users/profile/email', {
        newEmail,
        otp: otpValue,
      });

      await refreshUser();

      enqueueSnackbar(response.data.message || 'Email verified successfully', {
        variant: 'success',
      });

      onClose(true);
    } catch (verifyError) {
      setError(
        verifyError?.response?.data?.error?.message ||
          verifyError?.response?.data?.message ||
          verifyError?.message ||
          'Failed to verify OTP'
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} fullWidth maxWidth="xs">
      <DialogTitle>Verify Your Email</DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Receive updates related to your order. Please verify your email if you want order emails.
          </Typography>

          {error ? <Alert severity="error">{error}</Alert> : null}

          {!otpStep ? (
            <>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoFocus
                fullWidth
              />

              <LoadingButton
                variant="contained"
                onClick={handleSendOtp}
                loading={isSendingOtp}
              >
                Send OTP
              </LoadingButton>
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                Enter OTP sent to {newEmail}
              </Typography>

              <Stack direction="row" spacing={1.5} justifyContent="center">
                {otp.map((digit, index) => (
                  <TextField
                    key={index}
                    inputRef={otpRefs[index]}
                    value={digit}
                    onChange={(event) => handleOtpChange(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    inputProps={{
                      maxLength: 1,
                      style: {
                        textAlign: 'center',
                        fontSize: '22px',
                        fontWeight: 'bold',
                        padding: '14px 0',
                      },
                    }}
                    sx={{ width: 56 }}
                  />
                ))}
              </Stack>

              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setOtpStep(false);
                    setOtp(['', '', '', '']);
                    setError('');
                  }}
                  fullWidth
                >
                  Change Email
                </Button>

                <LoadingButton
                  variant="contained"
                  onClick={handleVerifyOtp}
                  loading={isVerifyingOtp}
                  fullWidth
                >
                  Verify
                </LoadingButton>
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Box sx={{ flexGrow: 1 }} />
        <Button color="inherit" onClick={() => onClose(false)}>
          Skip for now
        </Button>
      </DialogActions>
    </Dialog>
  );
}

CheckoutEmailVerificationDialog.propTypes = {
  initialEmail: PropTypes.string,
  onClose: PropTypes.func,
  open: PropTypes.bool,
};
