import { Helmet } from 'react-helmet-async';
import JwtNewPasswordView from '../../../sections/auth/jwt/jwt-new-password-view';
// sections

// ----------------------------------------------------------------------

export default function NewPasswordPage() {
  return (
    <>
      <Helmet>
        <title> Jwt: New Password</title>
      </Helmet>

      <JwtNewPasswordView />
    </>
  );
}
