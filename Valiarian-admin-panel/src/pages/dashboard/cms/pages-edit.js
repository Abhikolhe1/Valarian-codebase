import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
// sections
import { CMSPageEditView } from 'src/sections/cms/view';

// ----------------------------------------------------------------------

export default function CMSPageEditPage() {
  const params = useParams();

  const { id } = params;

  return (
    <>
      <Helmet>
        <title> Dashboard: Edit page</title>
      </Helmet>

      <CMSPageEditView id={id} />
    </>
  );
}
