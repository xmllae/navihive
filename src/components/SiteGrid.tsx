import type { ReactNode } from 'react';
import { Box } from '@mui/material';

export default function SiteGrid({ children }: { children: ReactNode }) {
  return (
    <Box
      data-site-grid
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(1, minmax(0, 1fr))',
          sm: 'repeat(2, minmax(0, 1fr))',
          md: 'repeat(3, minmax(0, 1fr))',
          lg: 'repeat(4, minmax(0, 1fr))',
          xl: 'repeat(5, minmax(0, 1fr))',
        },
        gap: 2,
        gridAutoRows: '1fr',
      }}
    >
      {children}
    </Box>
  );
}
