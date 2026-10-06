import { Drawer } from '@mui/material';
import type { ReactNode } from 'react';
export default function NavigationDrawer({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Drawer
      open
      onClose={onClose}
      ModalProps={{ disableRestoreFocus: true }}
      slotProps={{ paper: { sx: { width: 260, maxWidth: '85vw' } } }}
    >
      {children}
    </Drawer>
  );
}
