import { Helmet } from 'react-helmet-async';
// sections
import JwtForgotPasswordView from 'src/sections/auth/jwt/jwt-forgot-password-view';

// ----------------------------------------------------------------------

export default function ForgotPasswordPage() {
  return (
    <>
      <Helmet>
        <title>Forgot Password | Valiarian</title>
      </Helmet>

      <JwtForgotPasswordView />
    </>
  );
}
