import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
// sections
import { CMSPageDetailsView } from 'src/sections/cms/view';

// ----------------------------------------------------------------------

export default function CMSPageDetailsPage() {
  const params = useParams();

  const { id } = params;

  return (
    <>
      <Helmet>
        <title>Page Details | CMS</title>
      </Helmet>

      <CMSPageDetailsView id={id} />
    </>
  );
}
