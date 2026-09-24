import PageSEO from 'src/components/seo/PageSEO';
// sections
import { ContactView } from 'src/sections/contact/view';

// ----------------------------------------------------------------------

export default function ContactPage() {
  return (
    <>
      <PageSEO
        title="Contact Valiarian"
        description="Contact Valiarian for product, order, sizing, and customer support enquiries."
        canonicalUrl="https://valiarian.com/contact-us"
      />

      <ContactView />
    </>
  );
}
