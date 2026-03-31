import PropTypes from 'prop-types';
// @mui
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
// api
import { useGetAddresses } from 'src/api/addresses';
import { mapAddressToDisplay } from 'src/utils/address';

// ----------------------------------------------------------------------

export default function ProfileDisplay({ user }) {
  const { addresses, isLoading: addressesLoading } = useGetAddresses(
    user?.id,
    Boolean(user?.id)
  );

  // Find primary address
  const primaryAddress = addresses?.find((addr) => addr.isPrimary) || addresses?.[0];
  const displayAddress = primaryAddress ? mapAddressToDisplay(primaryAddress, user) : null;

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
         

          <Typography variant="h6" sx={{ mt: 3 }}>
            Profile Information
          </Typography>
          <Stack spacing={2}>
            <InfoRow label="Full Name" value={user.fullName || '-'} />
            <InfoRow label="Email" value={user.email || '-'} />
            <InfoRow label="Mobile" value={user.phone || '-'} />
          </Stack>

          <Typography variant="h6" sx={{ mt: 3 }}>
            Primary Address
          </Typography>
          {(() => {
            if (addressesLoading) {
              return (
                <Typography variant="body2" color="text.secondary">
                  Loading address...
                </Typography>
              );
            }

            if (primaryAddress) {
              return (
                <Stack spacing={2}>
                  <InfoRow label="Full Name" value={displayAddress?.fullName || '-'} />
                  <InfoRow label="Mobile" value={displayAddress?.mobileNumber || '-'} />
                  <InfoRow label="Address Type" value={displayAddress?.addressType || '-'} />
                  <InfoRow label="Full Address" value={displayAddress?.fullAddress || '-'} />
                </Stack>
              );
            }

            return (
              <Typography variant="body2" color="text.secondary">
                No address added yet
              </Typography>
            );
          })()}
        </Stack>
      </CardContent>
    </Card>
  );
}

ProfileDisplay.propTypes = {
  user: PropTypes.object,
};

// ----------------------------------------------------------------------

function InfoRow({ label, value }) {
  return (
    <Stack direction="row" spacing={2}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
        {label}:
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}

InfoRow.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
};
