import { Helmet } from 'react-helmet-async';
// sections
import OrdersListView from 'src/sections/orders/orders-list-view';

// ----------------------------------------------------------------------

export default function OrdersListPage() {
  return (
    <>
      <Helmet>
        <title>Orders | Valiarian Admin</title>
      </Helmet>

      <OrdersListView />
    </>
  );
}
