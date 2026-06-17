import PropTypes from 'prop-types';
// @mui
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {styled} from '@mui/material/styles';

// ----------------------------------------------------------------------

function getMapEmbedUrl(mapEmbedUrl, contacts = []) {
  if (mapEmbedUrl) {
    return mapEmbedUrl;
  }

  const latitude = Number(contacts[0]?.latitude);
  const longitude = Number(contacts[0]?.longitude);

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `https://www.google.com/maps?q=${latitude},${longitude}&z=12&output=embed`;
  }

  const address = contacts[0]?.address || 'Valiarian';
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&z=12&output=embed`;
}

// ----------------------------------------------------------------------

const StyledRoot = styled('div')(({theme}) => ({
  zIndex: 0,
  height: 560,
  overflow: 'hidden',
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.grey[200],
  boxShadow: theme.customShadows.z8,
}));

const StyledFrame = styled('iframe')({
  width: '100%',
  height: '100%',
  border: 0,
});

const StyledOverlay = styled(Stack)(({theme}) => ({
  left: theme.spacing(2),
  right: theme.spacing(2),
  bottom: theme.spacing(2),
  zIndex: 1,
  position: 'absolute',
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: 'rgba(255,255,255,0.92)',
  boxShadow: theme.customShadows.z8,
}));

// ----------------------------------------------------------------------

export default function ContactMap({
  mapTitle = 'Visit our office',
  mapDescription = '',
  mapEmbedUrl = '',
  contacts = [],
}) {
  const src = getMapEmbedUrl(mapEmbedUrl, contacts);

  return (
    <StyledRoot>
      <StyledFrame
        title={mapTitle}
        src={src}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />

      {(mapTitle || mapDescription) && (
        <StyledOverlay spacing={0.75}>
          {!!mapTitle && <Typography variant="subtitle1">{mapTitle}</Typography>}
          {!!mapDescription && (
            <Typography variant="body2" color="text.secondary">
              {mapDescription}
            </Typography>
          )}
        </StyledOverlay>
      )}
    </StyledRoot>
  );
}

ContactMap.propTypes = {
  contacts: PropTypes.array,
  mapDescription: PropTypes.string,
  mapEmbedUrl: PropTypes.string,
  mapTitle: PropTypes.string,
};
