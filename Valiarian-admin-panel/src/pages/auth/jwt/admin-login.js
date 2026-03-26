import { Helmet } from 'react-helmet-async';
// sections
import { JwtLoginView } from 'src/sections/auth/jwt';

// ----------------------------------------------------------------------

export default function AdminLoginPage() {
  return (
    <>
      <Helmet>
        <title> Admin Login</title>
      </Helmet>

      <JwtLoginView loginType="admin" />
    </>
  );
}
