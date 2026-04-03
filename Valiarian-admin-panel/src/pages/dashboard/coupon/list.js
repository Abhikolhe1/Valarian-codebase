import {Helmet} from 'react-helmet-async';
import CouponListView from 'src/sections/coupon/view/coupon-list-view';

export default function CouponListPage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Coupons</title>
      </Helmet>

      <CouponListView />
    </>
  );
}
