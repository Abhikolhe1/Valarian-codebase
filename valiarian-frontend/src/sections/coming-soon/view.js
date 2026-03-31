// import PropTypes from 'prop-types';
// // @mui

// import Button from '@mui/material/Button';
// import IconButton from '@mui/material/IconButton';
// import InputAdornment from '@mui/material/InputAdornment';
// import Stack from '@mui/material/Stack';
// import { alpha } from '@mui/material/styles';
// import TextField from '@mui/material/TextField';
// import Typography from '@mui/material/Typography';
// // hooks
// import { useCountdownDate } from 'src/hooks/use-countdown';
// // _mock
// import { _socials } from 'src/_mock';
// // assets
// import { ComingSoonIllustration } from 'src/assets/illustrations';
// // components
// import { Box } from '@mui/material';
// import Iconify from 'src/components/iconify';

// // ----------------------------------------------------------------------

// export default function ComingSoonView() {
//   const { days, hours, minutes, seconds } = useCountdownDate(
//     new Date('07/07/2024 21:30')
//   );

//   return (
//     <Box
//       sx={{
//         minHeight: '100vh',
//         display: 'flex',
//         alignItems: 'center',
//         justifyContent: 'center',
//         textAlign: 'center',
//         px: 2,
//       }}
//     >
//       <Box maxWidth={480} width="100%">
//         {/* Title */}
//         <Typography variant="h3" paragraph>
//           Coming Soon!
//         </Typography>

//         <Typography sx={{ color: 'text.secondary' }}>
//           We are currently working hard on this page!
//         </Typography>

//         {/* Illustration */}
//         <ComingSoonIllustration sx={{ my: 6, height: 240 }} />

//         {/* Countdown */}
//         <Stack
//           direction="row"
//           justifyContent="center"
//           alignItems="center"
//           spacing={2}
//           sx={{ typography: 'h2' }}
//         >
//           <TimeBlock label="Days" value={days} />
//           <TimeBlock label="Hours" value={hours} />
//           <TimeBlock label="Minutes" value={minutes} />
//           <TimeBlock label="Seconds" value={seconds} />
//         </Stack>

//         {/* Email */}
//         <TextField
//           fullWidth
//           placeholder="Enter your email"
//           sx={{ my: 5 }}
//           InputProps={{
//             endAdornment: (
//               <InputAdornment position="end">
//                 <Button variant="contained">Notify</Button>
//               </InputAdornment>
//             ),
//           }}
//         />

//         {/* Social Icons */}
//         <Stack direction="row" justifyContent="center" spacing={1}>
//           {_socials.map((social) => (
//             <IconButton
//               key={social.name}
//               sx={{
//                 color: social.color,
//                 '&:hover': {
//                   bgcolor: alpha(social.color, 0.08),
//                 },
//               }}
//             >
//               <Iconify icon={social.icon} />
//             </IconButton>
//           ))}
//         </Stack>
//       </Box>
//     </Box>
//   );
// }
// // ----------------------------------------------------------------------
// function TimeBlock({ label, value }) {
//   return (
//     <Box textAlign="center">
//       <Typography variant="h2">{value}</Typography>
//       <Typography variant="body2" color="text.secondary">
//         {label}
//       </Typography>
//     </Box>
//   );
// }

// TimeBlock.propTypes = {
//   label: PropTypes.string,
//   value: PropTypes.string,
// };


// ----------------------------------------------------------------------------

import { Box, Container, Typography } from '@mui/material';
import { useGetComingSoonPage } from 'src/api/coming-soon';


export default function ComingSoon() {
  const { comingSoonPage, comingSoonPageLoading } = useGetComingSoonPage();

  const bgImages = {
    summer: comingSoonPage?.background?.summer,
    monsoon: comingSoonPage?.background?.monsoon,
    winter: comingSoonPage?.background?.winter,

    default: "/assets/images/coming-soon/summer.png"
  };

  const overlayOpacity = comingSoonPage?.background?.overlayOpacity || 0.5;

  const getSeason = () => {
    const month = new Date().getMonth() + 1;

    // if (month >= 3 && month <= 6) return 'summer';
    // if (month >= 7 && month <= 9) return 'monsoon';
    return 'default';
  };

  const season = getSeason();
  const bgImage = bgImages[season];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Background */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0,
        }}
      />

      {/* Overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: `rgba(0,0,0,${overlayOpacity})`,
          zIndex: 1,
        }}
      />

      {/* Content */}
      <Container
        maxWidth="sm"
        sx={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          display: 'flex',
          // alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',

        }}
      >
        <Box
          sx={{
            borderRadius: 3,

            px: { xs: 2, md: 4 },
            py: { xs: 4, md: 0 },
            mt: 0,
            backdropFilter: 'blur(5px)',
            display: 'flex',
            flexDirection: 'column',
            // alignItems: 'center',
            // justifyContent: 'center',
            gap: 1,
          }}
        >
          {/* Image */}
          <Box
            component="img"
            src={comingSoonPage?.content?.image ? comingSoonPage?.content?.image : "/assets/images/coming-soon/image.png"}
            alt="Coming Soon"
            sx={{
              maxWidth: '100%',
              height: 'auto',
              mx: 'auto',
              display: 'block',
              mt: -12,
              mb: -5,
            }}
          />

          {/* Subtitle */}
          <Typography
            variant="subtitle1"
            sx={{
              letterSpacing: 3,
              color: '#fff',
              opacity: 0.8,

            }}
          >
            {comingSoonPage?.content?.subtitle || "STAY TUNED"}
          </Typography>

          {/* Title */}
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.2,
              mb: 5
            }}
          >
            {comingSoonPage?.content?.title || "COMING SOON"}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
