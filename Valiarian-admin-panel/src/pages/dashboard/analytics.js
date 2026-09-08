import { Helmet } from 'react-helmet-async';
// sections
import StoreDashboardView from 'src/sections/overview/analytics/view/store-dashboard-view';

// ----------------------------------------------------------------------

export default function OverviewAnalyticsPage() {
  return (
    <>
      <Helmet>
        <title>Valiarian | Store dashboard</title>
      </Helmet>

      <StoreDashboardView />
    </>
  );
}
