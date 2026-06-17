import PropTypes from 'prop-types';
import { useState, useCallback, useMemo } from 'react';
// @mui
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Portal from '@mui/material/Portal';
import Backdrop from '@mui/material/Backdrop';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
import { useResponsive } from 'src/hooks/use-responsive';
import { useSnackbar } from 'src/components/snackbar';
// components
import Iconify from 'src/components/iconify';
import Editor from 'src/components/editor';
import { sendContactSubmissionReply } from 'src/api/contact-submissions';

// ----------------------------------------------------------------------

const ZINDEX = 1998;

const POSITION = 24;

export default function MailBox({ onCloseCompose, email, subject, contactTokenId, submissionId, onSent }) {
  const smUp = useResponsive('up', 'sm');
  const { enqueueSnackbar } = useSnackbar();

  const [message, setMessage] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const fullScreen = useBoolean();

  const tokenPrefix = useMemo(
    () => (contactTokenId ? `[${contactTokenId}] ` : ''),
    [contactTokenId]
  );

  const displaySubject = useMemo(() => {
    const baseSubject = subject?.trim() ? `Reply To: ${subject.trim()}` : 'Reply To: Contact Request';
    return `${baseSubject}${tokenPrefix}`;
  }, [subject, tokenPrefix]);

  const handleChangeMessage = useCallback((value) => {
    setMessage(value);
  }, []);

  const handleSend = useCallback(async () => {
    const cleanedSubject = replySubject.trim() || displaySubject;
    const cleanedMessage = message.trim();

    if (!submissionId) {
      enqueueSnackbar('Contact request id is missing.', { variant: 'error' });
      return;
    }

    if (!cleanedSubject) {
      enqueueSnackbar('Reply subject is required.', { variant: 'warning' });
      return;
    }

    if (!cleanedMessage || cleanedMessage === '<p><br></p>') {
      enqueueSnackbar('Reply message is required.', { variant: 'warning' });
      return;
    }

    try {
      setIsSending(true);

      const updatedSubmission = await sendContactSubmissionReply(submissionId, {
        subject: cleanedSubject,
        message: cleanedMessage,
      });

      enqueueSnackbar('Reply sent successfully.', { variant: 'success' });
      onSent?.(updatedSubmission);
      onCloseCompose?.();
    } catch (error) {
      enqueueSnackbar(error?.error?.message || error?.message || 'Failed to send reply.', {
        variant: 'error',
      });
    } finally {
      setIsSending(false);
    }
  }, [displaySubject, enqueueSnackbar, message, onCloseCompose, onSent, replySubject, submissionId]);

  return (
    <Portal>
      {(fullScreen.value || !smUp) && <Backdrop open sx={{ zIndex: ZINDEX }} />}

      <Paper
        sx={{
          right: 0,
          bottom: 0,
          borderRadius: 2,
          display: 'flex',
          position: 'fixed',
          zIndex: ZINDEX + 1,
          m: `${POSITION}px`,
          overflow: 'hidden',
          flexDirection: 'column',
          boxShadow: (theme) => theme.customShadows.dropdown,
          ...(fullScreen.value && {
            m: 0,
            right: POSITION / 2,
            bottom: POSITION / 2,
            width: `calc(100% - ${POSITION}px)`,
            height: `calc(100% - ${POSITION}px)`,
          }),
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          sx={{
            bgcolor: 'background.neutral',
            p: (theme) => theme.spacing(1.5, 1, 1.5, 2),
          }}
        >
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            New Message
          </Typography>

          <IconButton onClick={fullScreen.onToggle}>
            <Iconify icon={fullScreen.value ? 'eva:collapse-fill' : 'eva:expand-fill'} />
          </IconButton>

          <IconButton onClick={onCloseCompose}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Stack>

        <InputBase
          value={email || ''}
          placeholder="To..."
          readOnly
          sx={{
            px: 2,
            height: 48,
            borderBottom: (theme) => `solid 1px ${alpha(theme.palette.grey[500], 0.08)}`,
          }}

        />

        <Box sx={{ px: 2, borderBottom: (theme) => `solid 1px ${alpha(theme.palette.grey[500], 0.08)}` }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: 48 }}>
            <Typography variant="subtitle1" sx={{ minWidth: 72 }}>
              Subject
            </Typography>

            <InputBase
              value={replySubject || displaySubject}
              onChange={(event) => setReplySubject(event.target.value)}
              placeholder="Subject"
              fullWidth
              sx={{ height: 40 }}
            />
          </Stack>
        </Box>

        <Stack spacing={2} flexGrow={1} sx={{ p: 2 }}>
          <Editor
            simple
            id="compose-mail"
            value={message}
            onChange={handleChangeMessage}
            placeholder="Type a message"
            sx={{
              '& .ql-editor': {},
              ...(fullScreen.value && {
                height: 1,
                '& .quill': {
                  height: 1,
                },
                '& .ql-editor': {
                  maxHeight: 'unset',
                },
              }),
            }}
          />

          <Stack direction="row" display="flex" justifyContent='flex-end' >
            {/* <Stack direction="row" alignItems="center" flexGrow={1}>
              <IconButton>
                <Iconify icon="solar:gallery-add-bold" />
              </IconButton>

              <IconButton>
                <Iconify icon="eva:attach-2-fill" />
              </IconButton>
            </Stack> */}

            <Button
              variant="contained"
              color="primary"
              disabled={isSending}
              onClick={handleSend}
              endIcon={<Iconify icon="iconamoon:send-fill" />}
            >
              {isSending ? 'Sending...' : 'Send'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Portal>
  );
}

MailBox.propTypes = {
  onCloseCompose: PropTypes.func,
  email: PropTypes.string,
  contactTokenId: PropTypes.string,
  submissionId: PropTypes.string,
  onSent: PropTypes.func,
  subject: PropTypes.string,
};
