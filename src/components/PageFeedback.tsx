import { Snackbar, Alert } from '@mui/material';
interface Props {
  snackbarOpen: boolean;
  handleCloseSnackbar: () => void;
  snackbarMessage: string;
  importResultOpen: boolean;
  setImportResultOpen: (open: boolean) => void;
  importResultMessage: string;
}
export default function PageFeedback({
  snackbarOpen,
  handleCloseSnackbar,
  snackbarMessage,
  importResultOpen,
  setImportResultOpen,
  importResultMessage,
}: Props) {
  return (
    <>
      {' '}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity='error'
          variant='filled'
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>{' '}
      <Snackbar
        open={importResultOpen}
        autoHideDuration={6000}
        onClose={() => setImportResultOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setImportResultOpen(false)}
          severity='success'
          variant='filled'
          sx={{
            width: '100%',
            whiteSpace: 'pre-line',
            backgroundColor: (theme) => (theme.palette.mode === 'dark' ? '#2e7d32' : undefined),
            color: (theme) => (theme.palette.mode === 'dark' ? '#fff' : undefined),
            '& .MuiAlert-icon': {
              color: (theme) => (theme.palette.mode === 'dark' ? '#fff' : undefined),
            },
          }}
        >
          {importResultMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
