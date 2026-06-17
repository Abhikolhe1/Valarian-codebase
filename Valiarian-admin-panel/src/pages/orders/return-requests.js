import {Helmet} from 'react-helmet-async';
import ReturnRequestsView from 'src/sections/orders/return-requests-view';

export default function ReturnRequestsPage() {
  return (
    <>
      <Helmet>
        <title>Return Requests | Valiarian Admin</title>
      </Helmet>

      <ReturnRequestsView />
    </>
  );
}
