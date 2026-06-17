import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
// @mui
import LoadingButton from '@mui/lab/LoadingButton';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
// components
import { ConfirmDialog } from 'src/components/custom-dialog';
import Iconify from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { useSnackbar } from 'src/components/snackbar';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
// utils
import { fDateTime } from 'src/utils/format-time';
import axiosInstance, { endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

export default function CMSVersionHistoryDialog({ open, onClose, pageId, onRevert }) {
  const { enqueueSnackbar } = useSnackbar();

  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [compareVersion, setCompareVersion] = useState(null);
  const [revertComment, setRevertComment] = useState('');
  const [isReverting, setIsReverting] = useState(false);

  const revertConfirm = useBoolean();
  const compareDialog = useBoolean();

  const fetchVersions = useCallback(async () => {
    if (!pageId) return;

    try {
      setLoading(true);
      const response = await axiosInstance.get(endpoints.cms.pages.versions(pageId));
      setVersions(response.data?.versions || response.data || []);
    } catch (error) {
      console.error('Error fetching versions:', error);
      enqueueSnackbar('Failed to load version history', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [pageId, enqueueSnackbar]);

  useEffect(() => {
    if (open && pageId) {
      fetchVersions();
    }
  }, [open, pageId, fetchVersions]);

  const handleRevert = useCallback(async () => {
    if (!selectedVersion) return;

    try {
      setIsReverting(true);
      const response = await axiosInstance.post(
        endpoints.cms.pages.revert(pageId, selectedVersion.version),
        {
          comment: revertComment || `Reverted to version ${selectedVersion.version}`,
        }
      );

      const revertedPage = response.data;
      enqueueSnackbar(`Successfully reverted to version ${selectedVersion.version}`, {
        variant: 'success',
      });
      revertConfirm.onFalse();
      setSelectedVersion(null);
      setRevertComment('');

      if (onRevert) {
        onRevert(revertedPage);
      }

      onClose();
    } catch (error) {
      console.error('Error reverting version:', error);
      enqueueSnackbar('Failed to revert to version', { variant: 'error' });
    } finally {
      setIsReverting(false);
    }
  }, [selectedVersion, pageId, revertComment, enqueueSnackbar, revertConfirm, onRevert, onClose]);

  const handleCompare = useCallback((version) => {
    setCompareVersion(version);
    compareDialog.onTrue();
  }, [compareDialog]);

  const renderVersionItem = (version, index) => {
    const isLatest = index === 0;
    const isCurrent = selectedVersion?.id === version.id;

    return (
      <ListItem
        key={version.id}
        disablePadding
        secondaryAction={
          <Stack direction="row" spacing={1}>
            {!isLatest && (
              <IconButton
                edge="end"
                size="small"
                onClick={() => {
                  setSelectedVersion(version);
                  setRevertComment(`Reverted to version ${version.version}`);
                  revertConfirm.onTrue();
                }}
              >
                <Iconify icon="solar:history-bold" />
              </IconButton>
            )}
            <IconButton
              edge="end"
              size="small"
              onClick={() => handleCompare(version)}
            >
              <Iconify icon="solar:eye-bold" />
            </IconButton>
          </Stack>
        }
      >
        <ListItemButton
          selected={isCurrent}
          onClick={() => setSelectedVersion(version)}
        >
          <ListItemAvatar>
            <Avatar sx={{ bgcolor: isLatest ? 'primary.main' : 'grey.500' }}>
              <Iconify icon="solar:document-text-bold" />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle2">Version {version.version}</Typography>
                {isLatest && <Chip label="Current" size="small" color="primary" />}
              </Stack>
            }
            secondary={
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {fDateTime(version.createdAt)}
                </Typography>
                {version.comment && (
                  <Typography variant="body2" color="text.secondary">
                    {version.comment}
                  </Typography>
                )}
                {version.createdBy && (
                  <Typography variant="caption" color="text.disabled">
                    by {version.createdBy}
                  </Typography>
                )}
              </Stack>
            }
          />
        </ListItemButton>
      </ListItem>
    );
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Version History</Typography>
            <IconButton onClick={onClose}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {loading && (
            <Box sx={{ py: 5 }}>
              <LoadingScreen />
            </Box>
          )}

          {!loading && versions.length === 0 && (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No version history available
              </Typography>
            </Box>
          )}

          {!loading && versions.length > 0 && (
            <List disablePadding>
              {versions.map((version, index) => (
                <Box key={version.id}>
                  {renderVersionItem(version, index)}
                  {index < versions.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} color="inherit">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revert Confirmation Dialog */}
      <ConfirmDialog
        open={revertConfirm.value}
        onClose={revertConfirm.onFalse}
        title="Revert to Version"
        content={
          <Stack spacing={2}>
            <Typography>
              Are you sure you want to revert to version {selectedVersion?.version}? This will
              create a new version with the content from version {selectedVersion?.version}.
            </Typography>
            <TextField
              fullWidth
              label="Comment (optional)"
              value={revertComment}
              onChange={(e) => setRevertComment(e.target.value)}
              multiline
              rows={2}
              placeholder="Describe why you're reverting to this version..."
            />
          </Stack>
        }
        action={
          <LoadingButton
            variant="contained"
            color="warning"
            onClick={handleRevert}
            loading={isReverting}
          >
            Revert
          </LoadingButton>
        }
      />

      {/* Compare/Preview Dialog */}
      <Dialog
        open={compareDialog.value}
        onClose={compareDialog.onFalse}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              Version {compareVersion?.version} Details
            </Typography>
            <IconButton onClick={compareDialog.onFalse}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {compareVersion && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Metadata
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>Version:</strong> {compareVersion.version}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Created:</strong> {fDateTime(compareVersion.createdAt)}
                  </Typography>
                  {compareVersion.createdBy && (
                    <Typography variant="body2">
                      <strong>Created By:</strong> {compareVersion.createdBy}
                    </Typography>
                  )}
                  {compareVersion.comment && (
                    <Typography variant="body2">
                      <strong>Comment:</strong> {compareVersion.comment}
                    </Typography>
                  )}
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Page Content
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'background.neutral',
                    borderRadius: 1,
                    maxHeight: 400,
                    overflow: 'auto',
                  }}
                >
                  <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                    {JSON.stringify(compareVersion.content, null, 2)}
                  </pre>
                </Box>
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={compareDialog.onFalse} color="inherit">
            Close
          </Button>
          {compareVersion && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<Iconify icon="solar:history-bold" />}
              onClick={() => {
                compareDialog.onFalse();
                setSelectedVersion(compareVersion);
                setRevertComment(`Reverted to version ${compareVersion.version}`);
                revertConfirm.onTrue();
              }}
            >
              Revert to This Version
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}

CMSVersionHistoryDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  pageId: PropTypes.string,
  onRevert: PropTypes.func,
};
