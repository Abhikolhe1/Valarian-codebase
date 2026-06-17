import { Helmet } from 'react-helmet-async';
// sections
import { JwtLoginView } from 'src/sections/auth/jwt';

// ----------------------------------------------------------------------

export default function LoginPage() {
  return (
    <>
      <Helmet>
        <title> Super Admin Login</title>
      </Helmet>

      <JwtLoginView loginType="super_admin" />
    </>
  );
}
