import PageSEO from 'src/components/seo/PageSEO';
// sections
import { FaqsView } from 'src/sections/faqs/view';

// ----------------------------------------------------------------------

export default function FaqsPage() {
  return (
    <>
      <PageSEO
        title="Frequently Asked Questions | Valiarian"
        description="Find answers about Valiarian products, sizing, ordering, delivery, returns, and customer support."
        canonicalUrl="https://valiarian.com/faqs"
      />

      <FaqsView />
    </>
  );
}
