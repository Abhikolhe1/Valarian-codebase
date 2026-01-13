import { Helmet } from 'react-helmet-async';
import JwtForgotPasswordView from 'src/sections/auth/jwt/jwt-forgot-password-view';
// sections

// ----------------------------------------------------------------------

export default function ForgotPasswordPage() {
  return (
    <>
      <Helmet>
        <title> Jwt: Forgot Password</title>
      </Helmet>

      <JwtForgotPasswordView />
    </>
  );
}
