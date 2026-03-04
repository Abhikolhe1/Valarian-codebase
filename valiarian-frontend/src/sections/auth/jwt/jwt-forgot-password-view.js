import { yupResolver } from '@hookform/resolvers/yup';
import LoadingButton from '@mui/lab/LoadingButton';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PropTypes from 'prop-types';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import FormProvider, { RHFTextField } from 'src/components/hook-form';
import { useBoolean } from 'src/hooks/use-boolean';
import { useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
import * as Yup from 'yup';

export default function JwtForgotPasswordView() {
  const [selectedOption, setSelectedOption] = useState(null);

  return (
    <Box>
      {!selectedOption && (
        <Stack spacing={3}>
          <Typography variant="h4">Forgot Password</Typography>
          <Card onClick={() => setSelectedOption('old-password')} sx={{ cursor: 'pointer' }}>
            <CardContent>
              <Typography>Use Old Password</Typography>
            </CardContent>
          </Card>
          <Card onClick={() => setSelectedOption('otp')} sx={{ cursor: 'pointer' }}>
            <CardContent>
              <Typography>Try Another Way</Typography>
            </CardContent>
          </Card>
        </Stack>
      )}
      {selectedOption === 'old-password' && <ChangePasswordForm onBack={() => setSelectedOption(null)} />}
      {selectedOption === 'otp' && <ResetPasswordForm onBack={() => setSelectedOption(null)} />}
    </Box>
  );
}

function ChangePasswordForm({ onBack }) {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');
  const password = useBoolean();

  const methods = useForm({
    resolver: yupResolver(
      Yup.object().shape({
        oldPassword: Yup.string().required('Required'),
        newPassword: Yup.string().required('Required').min(8),
      })
    ),
  });

  const onSubmit = methods.handleSubmit(async (data) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch('http://localhost:3035/api/auth/update-password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed');
      router.push(paths.auth.jwt.login);
    } catch (error) {
      setErrorMsg(error.message);
    }
  });

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={2}>
        <Button onClick={onBack}>Back</Button>
        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
        <RHFTextField name="oldPassword" label="Old Password" type={password.value ? 'text' : 'password'} />
        <RHFTextField name="newPassword" label="New Password" type="password" />
        <LoadingButton type="submit" variant="contained">Change Password</LoadingButton>
      </Stack>
    </FormProvider>
  );
}

ChangePasswordForm.propTypes = { onBack: PropTypes.func };

function ResetPasswordForm({ onBack }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const methods1 = useForm();
  const methods2 = useForm();

  const sendOTP = methods1.handleSubmit(async (data) => {
    try {
      const response = await fetch('http://localhost:3035/api/auth/forget-password/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.identifier, role: 'user' }),
      });
      if (!response.ok) throw new Error('Failed');
      setIdentifier(data.identifier);
      setStep(2);
    } catch (error) {
      setErrorMsg(error.message);
    }
  });

  const resetPassword = methods2.handleSubmit(async (data) => {
    try {
      const response = await fetch('http://localhost:3035/api/auth/forget-password/verify-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, otp: data.otp, role: 'user', newPassword: data.newPassword }),
      });
      if (!response.ok) throw new Error('Failed');
      router.push(paths.auth.jwt.login);
    } catch (error) {
      setErrorMsg(error.message);
    }
  });

  return (
    <Box>
      {step === 1 && (
        <FormProvider methods={methods1} onSubmit={sendOTP}>
          <Stack spacing={2}>
            <Button onClick={onBack}>Back</Button>
            {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
            <RHFTextField name="identifier" label="Mobile or Email" />
            <LoadingButton type="submit" variant="contained">Send OTP</LoadingButton>
          </Stack>
        </FormProvider>
      )}
      {step === 2 && (
        <FormProvider methods={methods2} onSubmit={resetPassword}>
          <Stack spacing={2}>
            <Button onClick={() => setStep(1)}>Back</Button>
            {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
            <RHFTextField name="otp" label="OTP" />
            <RHFTextField name="newPassword" label="New Password" type="password" />
            <LoadingButton type="submit" variant="contained">Reset Password</LoadingButton>
          </Stack>
        </FormProvider>
      )}
    </Box>
  );
}

ResetPasswordForm.propTypes = { onBack: PropTypes.func };
