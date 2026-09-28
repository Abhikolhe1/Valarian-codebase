import { Helmet } from 'react-helmet-async';
// sections
import { PostListHomeView } from 'src/sections/blog/view';

// ----------------------------------------------------------------------

export default function PostListHomePage() {
  return (
    <>
      <Helmet>
        <title>Valiarian Style Journal | Polo Shirts, Fit & Care Guides</title>
        <meta
          name="description"
          content="Explore Valiarian guides on polo shirt styling, fit, fabrics and care, written to help you choose and wear premium polos with confidence."
        />
        <link rel="canonical" href="https://valiarian.com/blog" />
      </Helmet>

      <PostListHomeView />
    </>
  );
}
