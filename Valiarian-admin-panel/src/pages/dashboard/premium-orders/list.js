import { Helmet } from 'react-helmet-async';
import PremiumOrdersListView from 'src/sections/premium-orders/view/premium-orders-list-view';

export default function PremiumOrdersListPage() {
  return (
    <>
      <Helmet>
        <title>Premium Orders | Valiarian Admin</title>
      </Helmet>

      <PremiumOrdersListView />
    </>
  );
}
