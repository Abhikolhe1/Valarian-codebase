import { Helmet } from 'react-helmet-async';
// sections
import { FavoritesView } from 'src/sections/favorites';

// ----------------------------------------------------------------------

export default function FavoritesPage() {
  return (
    <>
      <Helmet>
        <title>Favorites | Valiarian</title>
      </Helmet>

      <FavoritesView />
    </>
  );
}
