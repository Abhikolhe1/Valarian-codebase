import PropTypes from 'prop-types';
// @mui
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export default function OrderDetailsInfo({ customer, delivery, payment, shippingAddress }) {
  const renderRow = (label, value) => (
    <Stack direction="row" alignItems="flex-start" spacing={2}>
      <Box component="span" sx={{ color: 'text.secondary', width: 120, flexShrink: 0 }}>
        {label}
      </Box>
      <Box sx={{ wordBreak: 'break-word' }}>{value || '-'}</Box>
    </Stack>
  );

  const renderCustomer = (
    <>
      <CardHeader title="Customer Info" />
      <Stack direction="row" sx={{ p: 3 }}>
        <Avatar
          alt={customer.name}
          src={customer.avatarUrl}
          sx={{ width: 48, height: 48, mr: 2 }}
        />

        <Stack spacing={0.5} alignItems="flex-start" sx={{ typography: 'body2' }}>
          <Typography variant="subtitle2">{customer.name || '-'}</Typography>
          <Box sx={{ color: 'text.secondary' }}>{customer.email || '-'}</Box>
          <Box sx={{ color: 'text.secondary' }}>{customer.phone || '-'}</Box>
        </Stack>
      </Stack>
    </>
  );

  const renderDelivery = (
    <>
      <CardHeader title="Delivery" />
      <Stack spacing={1.5} sx={{ p: 3, typography: 'body2' }}>
        {renderRow('Carrier', delivery.carrier)}
        {renderRow('Estimated', delivery.estimatedDelivery)}
        <Stack direction="row" alignItems="flex-start" spacing={2}>
          <Box component="span" sx={{ color: 'text.secondary', width: 120, flexShrink: 0 }}>
            Tracking No.
          </Box>
          {delivery.trackingNumber ? (
            <Link underline="always" color="inherit">
              {delivery.trackingNumber}
            </Link>
          ) : (
            <Box>-</Box>
          )}
        </Stack>
      </Stack>
    </>
  );

  const renderShipping = (
    <>
      <CardHeader title="Shipping" />
      <Stack spacing={1.5} sx={{ p: 3, typography: 'body2' }}>
        {renderRow('Address', shippingAddress.fullAddress)}
        {renderRow('Phone number', shippingAddress.phoneNumber)}
      </Stack>
    </>
  );

  const renderPayment = (
    <>
      <CardHeader title="Payment" />
      <Stack spacing={1.5} sx={{ p: 3, typography: 'body2' }}>
        {renderRow('Method', payment.method)}
        {renderRow('Status', payment.status)}
      </Stack>
    </>
  );

  return (
    <Card>
      {renderCustomer}

      <Divider sx={{ borderStyle: 'dashed' }} />

      {renderDelivery}

      <Divider sx={{ borderStyle: 'dashed' }} />

      {renderShipping}

      <Divider sx={{ borderStyle: 'dashed' }} />

      {renderPayment}
    </Card>
  );
}

OrderDetailsInfo.propTypes = {
  customer: PropTypes.object,
  delivery: PropTypes.object,
  payment: PropTypes.object,
  shippingAddress: PropTypes.object,
};
