import { Snackbar, Alert } from '@mui/material';
export default function GroupFeedback({
  snackbarOpen,
  handleCloseSnackbar,
  snackbarMessage,
}: {
  snackbarOpen: boolean;
  handleCloseSnackbar: () => void;
  snackbarMessage: string;
}) {
  return (
    <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
      <Alert onClose={handleCloseSnackbar} severity='info' sx={{ width: '100%' }}>
        {snackbarMessage}
      </Alert>
    </Snackbar>
  );
}
