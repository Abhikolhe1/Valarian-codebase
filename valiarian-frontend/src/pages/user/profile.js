import { Helmet } from 'react-helmet-async';
import UserProfileView from 'src/sections/user/view/user-profile-view';

export default function UserProfilePage() {
  return (
    <>
      <Helmet>
        <title>My Profile | Valiarian</title>
      </Helmet>

      <UserProfileView />
    </>
  );
}
