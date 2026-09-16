// sections
import PageSEO from 'src/components/seo/PageSEO';
import { NotFoundView } from 'src/sections/error';

// ----------------------------------------------------------------------

export default function NotFoundPage() {
  return (
    <>
      <PageSEO title="404 Page Not Found | Valiarian" noIndex />

      <NotFoundView />
    </>
  );
}
