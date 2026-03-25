import { Container, Grid, Stack, Typography } from "@mui/material";
import { m } from 'framer-motion';
import { MotionViewport, varFade } from "src/components/animate";
import Iconify from "src/components/iconify";



export function AboutValues() {

  const values = [
    {
      icon: "mdi:medal-outline",
      title: "Craftsmanship",
      description:
        "Every detail matters. From the selection of premium cotton to the final stitch, we never compromise on quality.",
    },
    {
      icon: "mdi:sync",
      title: "Sustainability",
      description:
        "We're committed to ethical production, sustainable materials, and creating garments designed to last a lifetime.",
    },
    {
      icon: "mdi:infinity",
      title: "Timelessness",
      description:
        "We don't follow trends. We create classic pieces that transcend seasons and remain relevant year after year.",
    },
  ];

  return (<>
    <Container component={MotionViewport} sx={{ textAlign: 'center', pt: { xs: 10, md: 15 } }}>
      <Stack spacing={3}>
        {/* <m.div variants={varFade().inUp}>

        </m.div> */}
        <m.div variants={varFade().inUp}>
          <Stack alignItems="center" textAlign="center" spacing={4}>
            <Typography variant="h3" fontWeight="900" color="primary.main" >Our Values</Typography>
            <Grid container spacing={2} >
              {values.map((card, i) => (
                <Grid item xs={12} md={4} key={i}>

                  <Iconify icon={card.icon} width={28} />
                  <Typography fontWeight="bold" mt={1}>
                    {card.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {card.description}</Typography>

                </Grid>
              ))}
            </Grid>
          </Stack>
        </m.div>
      </Stack>
    </Container>
  </>)
}
