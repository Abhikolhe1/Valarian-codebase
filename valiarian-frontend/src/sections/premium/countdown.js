import {
  Box,
  Button,
  Card,
  Container,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useEffect, useState } from 'react';

// Styled Components
const ProductSection = styled(Box)({
  position: 'relative',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#f5f5f0',
  padding: '80px 0',
});

const ContentContainer = styled(Container)({
  position: 'relative',
  zIndex: 2,
});

const TopBar = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '80px',
  flexWrap: 'wrap',
  gap: '20px',
  borderTop: '2px solid #7A4100',
  borderBottom: '2px solid #7A4100',
  padding: '18px 0',
  '@media (max-width: 768px)': {
    justifyContent: 'center',
    textAlign: 'center',
  },
});

const EditionInfo = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  '@media (max-width: 768px)': {
    alignItems: 'center',
  },
});

const EditionTitle = styled(Typography)({
  fontFamily: '"Lato", "Helvetica", sans-serif',
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#2c2c2c',
  marginBottom: '4px',
  letterSpacing: '0.5px',
});

const EditionCount = styled(Typography)({
  fontFamily: '"Lato", "Helvetica", sans-serif',
  fontSize: '0.95rem',
  fontWeight: 400,
  color: '#666666',
  letterSpacing: '0.3px',
});

const ControlsWrapper = styled(Box)({
  display: 'flex',
  gap: '16px',
  alignItems: 'center',
  '@media (max-width: 768px)': {
    flexDirection: 'column',
    width: '100%',
  },
});

const StyledToggleButtonGroup = styled(ToggleButtonGroup)({
  backgroundColor: '#d8d8d0',
  borderRadius: '30px',
  padding: '4px',
  border: 'none',
  '& .MuiToggleButtonGroup-grouped': {
    border: 'none',
    borderRadius: '26px !important',
    margin: '0',
    '&:not(:first-of-type)': {
      marginLeft: '0',
    },
  },
});

const SizeButton = styled(ToggleButton)({
  fontFamily: '"Lato", "Helvetica", sans-serif',
  fontSize: '0.9rem',
  fontWeight: 600,
  color: '#666666',
  backgroundColor: 'transparent',
  border: 'none',
  padding: '10px 20px',
  minWidth: '48px',
  textTransform: 'uppercase',
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  '&.Mui-selected': {
    backgroundColor: '#ffffff',
    color: '#2c2c2c',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    '&:hover': {
      backgroundColor: '#ffffff',
    },
  },
});

const PreorderButton = styled(Button)({
  fontFamily: '"Lato", "Helvetica", sans-serif',
  fontSize: '0.95rem',
  fontWeight: 600,
  letterSpacing: '0.5px',
  textTransform: 'capitalize',
  padding: '12px 40px',
  backgroundColor: '#1a1a1a',
  color: '#ffffff',
  borderRadius: '30px',
  boxShadow: 'none',
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: '#2c2c2c',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    transform: 'translateY(-1px)',
  },
  '&:active': {
    transform: 'translateY(0)',
  },
  '@media (max-width: 768px)': {
    width: '100%',
  },
});

const MainContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: "column",
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
  gap: '60px',

  [theme.breakpoints.down('md')]: {
    flexDirection: 'column',
    gap: '40px',
    alignItems: 'center',
    padding: '0 16px', // 👈 mobile side padding
  },
}));

const TextContent = styled(Box)({
  // flex: 1,
  maxWidth: 'auto',
});

const MainHeading = styled(Typography)({
  fontFamily: '"Lora", "Georgia", serif',
  fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
  fontWeight: 500,
  color: '#a89479',
  lineHeight: 1.2,
  marginBottom: '16px',
  letterSpacing: '-0.5px',
});

const ItalicHeading = styled(Typography)({
  fontFamily: '"Lora", "Georgia", serif',
  fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
  fontWeight: 500,
  fontStyle: 'italic',
  color: '#a89479',
  lineHeight: 1.2,
  marginBottom: '32px',
  letterSpacing: '-0.5px',
});

const Description = styled(Typography)({
  fontFamily: '"Lato", "Helvetica", sans-serif',
  fontSize: '1.05rem',
  lineHeight: 1.8,
  color: '#666666',
  maxWidth: '540px',
  fontWeight: 400,
  letterSpacing: '0.2px',
});

const CountdownWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '110%',
  px: { xs: 0, sm: 0, md: 0 }, // 👈 responsive padding
}));


const CountdownCard = styled(Card)({
  padding: '32px',
  borderRadius: '20px',
  border: '1px solid #e0e0e0',
  backgroundColor: '#ffffff',
  minWidth: '420px',
  textAlign: 'center',
  boxShadow: '0 12px 35px rgba(0,0,0,0.06)',

  '@media (max-width: 968px)': {
    width: '100%',
    minWidth: 'unset',
  },
});

const CountdownLabel = styled(Typography)({
  fontFamily: 'public sans',
  fontSize: '1.2rem',
  fontWeight: 800,
  color: '#2c2c2c',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  marginBottom: '24px',
  textAlign: 'center',
});

const TimerGrid = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '20px',
  '@media (max-width: 480px)': {
    gap: '10px',
  },
});

const TimeUnit = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '20px 14px',
  border: '1px solid #e6e6e6',
  borderRadius: '16px',
  backgroundColor: '#fafafa',
});

const TimeValue = styled(Typography)({
  fontFamily: '"Lora", "Georgia", serif',
  fontSize: '3rem',
  fontWeight: 600,
  color: '#2c2c2c',
  lineHeight: 1,
  marginBottom: '8px',
  '@media (max-width: 480px)': {
    fontSize: '1.5rem',
  },
});

const TimeLabel = styled(Typography)({
  fontFamily: '"Lato", "Helvetica", sans-serif',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#666666',
  textTransform: 'capitalize',
  letterSpacing: '0.5px',
});

const ProductLuxurySection = () => {
  const [selectedSize, setSelectedSize] = useState('M');
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 12,
    minutes: 30,
    seconds: 14,
  });

  const handleSizeChange = (event, newSize) => {
    if (newSize !== null) {
      setSelectedSize(newSize);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        let { days, hours, minutes, seconds } = prevTime;

        if (seconds > 0) {
          seconds -= 1;
        } else if (minutes > 0) {
          minutes -= 1;
          seconds = 59;
        } else if (hours > 0) {
          hours -= 1;
          minutes = 59;
          seconds = 59;
        } else if (days > 0) {
          days -= 1;
          hours = 23;
          minutes = 59;
          seconds = 59;
        }

        return { days, hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (value) => value.toString().padStart(2, '0');

  return (
    <ProductSection>
      <ContentContainer maxWidth="lg">
        {/* Top Bar */}
        <TopBar>
          <EditionInfo>
            <EditionTitle>Standard Edition</EditionTitle>
            <EditionCount>240/400</EditionCount>
          </EditionInfo>

          <ControlsWrapper>
            <StyledToggleButtonGroup
              value={selectedSize}
              exclusive
              onChange={handleSizeChange}
              aria-label="size selection"
            >
              <SizeButton value="S" aria-label="small">
                S
              </SizeButton>
              <SizeButton value="M" aria-label="medium">
                M
              </SizeButton>
              <SizeButton value="L" aria-label="large">
                L
              </SizeButton>
              <SizeButton value="XL" aria-label="extra large">
                XL
              </SizeButton>
            </StyledToggleButtonGroup>

            <PreorderButton variant="contained" disableElevation>
              Preorder
            </PreorderButton>
          </ControlsWrapper>
        </TopBar>

        {/* Main Content */}
        <MainContent>
          <TextContent>
            <MainHeading>Time is Luxury</MainHeading>
            <ItalicHeading>Don&apos;t waste it.</ItalicHeading>
            <Description>
              The allocation window is closing. Once the timer reaches zero, the Signature Edition
              enters the vault, never to be produced again. Secure your legacy.
            </Description>
          </TextContent>

          <CountdownWrapper>
            <CountdownCard elevation={0}>
              <CountdownLabel>Drop Closes In</CountdownLabel>
              <TimerGrid>
                <TimeUnit>
                  <TimeValue>{formatTime(timeLeft.days)}</TimeValue>
                  <TimeLabel>Days</TimeLabel>
                </TimeUnit>
                <TimeUnit>
                  <TimeValue>{formatTime(timeLeft.hours)}</TimeValue>
                  <TimeLabel>Hours</TimeLabel>
                </TimeUnit>
                <TimeUnit>
                  <TimeValue>{formatTime(timeLeft.minutes)}</TimeValue>
                  <TimeLabel>Mins</TimeLabel>
                </TimeUnit>
                <TimeUnit>
                  <TimeValue>{formatTime(timeLeft.seconds)}</TimeValue>
                  <TimeLabel>Sec</TimeLabel>
                </TimeUnit>
              </TimerGrid>
            </CountdownCard>
          </CountdownWrapper>
        </MainContent>
      </ContentContainer>
    </ProductSection>
  );
};

export default ProductLuxurySection;
