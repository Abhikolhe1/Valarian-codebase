import PropTypes from 'prop-types';
// @mui
import Grid from '@mui/material/Unstable_Grid2';
import Alert from '@mui/material/Alert';

//
import { useGetAddresses } from 'src/api/addresses';
import { useAuthContext } from 'src/auth/hooks';
import { LoadingScreen } from 'src/components/loading-screen';
import { mapAddressToDisplay } from 'src/utils/address';
import AccountBillingPlan from './account-billing-plan';
import AccountBillingPayment from './account-billing-payment';
import AccountBillingHistory from './account-billing-history';
import AccountBillingAddress from './account-billing-address';

// ----------------------------------------------------------------------

export default function AccountBilling({ cards, plans, invoices }) {
  const { addresses, isLoading, error } = useGetAddresses();
  const { user } = useAuthContext();

  if (isLoading) {
    return <LoadingScreen />;
  }

  const addressBook = addresses.map((address) => mapAddressToDisplay(address, user));

  return (
    <Grid container spacing={5} disableEqualOverflow>
      <Grid xs={12} md={8}>
        {error ? <Alert severity="warning" sx={{ mb: 3 }}>Saved addresses could not be loaded.</Alert> : null}

        <AccountBillingPlan plans={plans} cardList={cards} addressBook={addressBook} />

        <AccountBillingPayment cards={cards} />

        <AccountBillingAddress />
      </Grid>

      <Grid xs={12} md={4}>
        <AccountBillingHistory invoices={invoices} />
      </Grid>
    </Grid>
  );
}

AccountBilling.propTypes = {
  cards: PropTypes.array,
  invoices: PropTypes.array,
  plans: PropTypes.array,
};
