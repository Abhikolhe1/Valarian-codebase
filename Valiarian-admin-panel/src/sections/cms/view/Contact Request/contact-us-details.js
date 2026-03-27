import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
// utils
import { fDateTime } from 'src/utils/format-time';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
// components
import Label from 'src/components/label';
import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';
import TextMaxLine from 'src/components/text-max-line';
import EmptyContent from 'src/components/empty-content';
import FileThumbnail from 'src/components/file-thumbnail';
import MailBox from './mail-box';

// ----------------------------------------------------------------------

function formatIssueTypeLabel(value) {
  if (!value) return '-';

  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function ContactUsDetails({ currentUser, renderLabel = () => null }) {
  const showAttachments = useBoolean(true);
  const openNav = useBoolean();
  const openCompose = useBoolean();
  const [submission, setSubmission] = useState(currentUser);

  useEffect(() => {
    setSubmission(currentUser);
  }, [currentUser]);

  const handleToggleCompose = useCallback(() => {
    if (openNav.value) {
      openNav.onFalse();
    }
    openCompose.onToggle();
  }, [openCompose, openNav]);
  const labelIds = submission?.status ? [submission.status] : [];

  const from = {
    name: submission?.name || '-',
    email: submission?.email || '-',
    avatarUrl: '',
  };

  const to = submission?.phoneNumber ? [{ email: submission.phoneNumber }] : [];

  const attachments = [];

  if (!submission) {
    return (
      <EmptyContent
        title="No Conversation Selected"
        description="Select a conversation to read"
        imgUrl="/assets/icons/empty/ic_email_selected.svg"
        sx={{
          borderRadius: 1.5,
          bgcolor: 'background.default',
        }}
      />
    );
  }


  const renderSubject = (
    <Stack spacing={2} flexShrink={0} sx={{ p: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        {labelIds.map((labelId) => {
          const label = renderLabel(labelId);

          return label ? (
            <Label key={label.id} color={label.color === 'default' ? 'default' : undefined}>
              {label.name}
            </Label>
          ) : (
            <Label key={labelId} variant="soft">
              {labelId}
            </Label>
          );
        })}
      </Stack>

      <TextMaxLine variant="subtitle2">
        <Stack
          flexShrink={0}
          direction="row"
          alignItems="center"
          sx={{
            p: (theme) => theme.spacing(2, 2, 1, 2),
          }}
        >
          <Avatar alt={from.name} src={`${from.avatarUrl}`} sx={{ mr: 2 }}>
            {from.name.charAt(0).toUpperCase()}
          </Avatar>

          <ListItemText
            primary={
              <>
                {from.name}
                <Box component="span" sx={{ typography: 'body2', color: 'text.disabled' }}>
                  {` <${from.email}>`}
                </Box>
              </>
            }
            secondary={
              <>
                {`To: `}
                {to.map((person) => (
                  <Link key={person.email} sx={{ color: 'text.secondary' }}>
                    {`${person.email}, `}
                  </Link>
                ))}
              </>
            }
            secondaryTypographyProps={{
              mt: 0.5,
              noWrap: true,
              component: 'span',
              typography: 'caption',
            }}
          />
        </Stack>
      </TextMaxLine>
    </Stack>
  );

  // const renderSender = (
  //   <Stack
  //     flexShrink={0}
  //     direction="row"
  //     alignItems="center"
  //     sx={{
  //       p: (theme) => theme.spacing(2, 2, 1, 2),
  //     }}
  //   >
  //     <Avatar alt={from.name} src={`${from.avatarUrl}`} sx={{ mr: 2 }}>
  //       {from.name.charAt(0).toUpperCase()}
  //     </Avatar>

  //     <ListItemText
  //       primary={
  //         <>
  //           {from.name}
  //           <Box component="span" sx={{ typography: 'body2', color: 'text.disabled' }}>
  //             {` <${from.email}>`}
  //           </Box>
  //         </>
  //       }
  //       secondary={
  //         <>
  //           {`To: `}
  //           {to.map((person) => (
  //             <Link key={person.email} sx={{ color: 'text.secondary' }}>
  //               {`${person.email}, `}
  //             </Link>
  //           ))}
  //         </>
  //       }
  //       secondaryTypographyProps={{
  //         mt: 0.5,
  //         noWrap: true,
  //         component: 'span',
  //         typography: 'caption',
  //       }}
  //     />
  //   </Stack>
  // );

  const renderAttachments = (
    <Stack
      spacing={1}
      sx={{
        p: 1,
        borderRadius: 1,
        bgcolor: 'background.neutral',
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <ButtonBase
          onClick={showAttachments.onToggle}
          sx={{ color: 'text.secondary', typography: 'caption', borderRadius: 0.5 }}
        >
          <Iconify icon="eva:attach-2-fill" sx={{ mr: 0.5 }} />
          {attachments.length} attachments
          <Iconify
            icon={
              showAttachments.value ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'
            }
            width={16}
            sx={{ ml: 0.5 }}
          />
        </ButtonBase>

        <Button startIcon={<Iconify icon="eva:cloud-download-fill" />}>Download</Button>
      </Stack>

      <Collapse in={showAttachments.value} unmountOnExit timeout="auto">
        <Stack direction="row" flexWrap="wrap" spacing={1}>
          {attachments.map((attachment) => (
            <Stack
              key={attachment.id}
              alignItems="center"
              justifyContent="center"
              sx={{
                width: 40,
                height: 40,
                flexShrink: 0,
                borderRadius: 1,
                overflow: 'hidden',
                position: 'relative',
                backgroundColor: 'background.neutral',
              }}
            >
              <FileThumbnail
                tooltip
                imageView
                file={attachment.preview}
                onDownload={() => console.info('DOWNLOAD')}
                sx={{ width: 24, height: 24 }}
              />
            </Stack>
          ))}
        </Stack>
      </Collapse>
    </Stack>
  );

  const renderContent = (
    <Stack
      direction="column"
      sx={{
        py: 3,
        flexGrow: 1,
        display: 'flex',
        minWidth: 0,
        transition: 'all 0.3s ease',
        mr: openCompose.value ? { xs: 0, md: '680px' } : 0,
      }}
    >
      <Box sx={{ py: 2, flexGrow: 1 }}>
        <Scrollbar>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="h6">
              Subject:
            </Typography>
            <Typography variant="subtitle2">
              {submission.subject || '-'}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
            <Typography variant="h6">
              Token ID:
            </Typography>
            <Typography variant="subtitle2">
              {submission.contactTokenId || '-'}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
            <Typography variant="h6">
              Issue Type:
            </Typography>
            <Typography variant="subtitle2">
              {submission.customIssueType || formatIssueTypeLabel(submission.issueType)}
            </Typography>
          </Stack>

          <Typography variant="h6" >
            Description:
          </Typography>
          <Box
            sx={{
              maxHeight: 280, // approx 10 lines
              overflowY: 'auto',
              pr: 1,
            }}
          >
            <Typography variant="subtitle2">
              {submission.message || '-'}
            </Typography>
          </Box>

          {!!submission.replySubject && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6">Last Reply:</Typography>

              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
                <Typography variant="subtitle2">Subject:</Typography>
                <Typography variant="body2">{submission.replySubject || '-'}</Typography>
              </Stack>

              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
                <Typography variant="subtitle2">Replied At:</Typography>
                <Typography variant="body2">
                  {submission.repliedAt ? fDateTime(submission.repliedAt) : '-'}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
                <Typography variant="subtitle2">Replied By:</Typography>
                <Typography variant="body2">{submission.repliedByEmail || '-'}</Typography>
              </Stack>

              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2">Reply Message:</Typography>
                <Box
                  sx={{ color: 'text.secondary', '& p': { my: 0.5 } }}
                  dangerouslySetInnerHTML={{
                    __html: submission.replyMessage || '-',
                  }}
                />
              </Box>
            </Box>
          )}
        </Scrollbar>
      </Box>
      {!openCompose.value && (
  <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
    <Button
      color="inherit"
      variant="contained"
      startIcon={<Iconify icon="solar:pen-bold" />}
      onClick={handleToggleCompose}
    >
      Compose
    </Button>
  </Box>
)}

      {openCompose.value && (
        <MailBox
          onCloseCompose={openCompose.onFalse}
          submissionId={submission?.id}
          email={submission?.email}
          subject={submission?.subject}
          contactTokenId={submission?.contactTokenId}
          onSent={setSubmission}
        />
      )}
    </Stack>
  );

  // const renderEditor = (
  //   <Stack
  //     spacing={2}
  //     sx={{
  //       p: (theme) => theme.spacing(0, 2, 2, 2),
  //     }}
  //   >
  //     {/* <MailBox simple id="reply-mail" /> */}

  //     <Stack direction="row" alignItems="end">
  //        <Button
  //         fullWidth
  //         color="inherit"
  //         variant="contained"
  //         startIcon={<Iconify icon="solar:pen-bold" />}
  //         onClick={handleToggleCompose}
  //       >
  //         Compose
  //       </Button>
  //     </Stack>
  //   </Stack>
  // );
  // const renderEditor = (
  //   <Stack
  //     spacing={2}
  //     sx={{
  //       p: (theme) => theme.spacing(0, 2, 2, 2),
  //     }}
  //   >
  //     <Stack direction="row" alignItems="end">
  //       <Button
  //         fullWidth
  //         color="inherit"
  //         variant="contained"
  //         startIcon={<Iconify icon="solar:pen-bold" />}
  //         onClick={handleToggleCompose}
  //       >
  //         Compose
  //       </Button>
  //     </Stack>

  //     {openCompose.value && (
  //       <MailBox onCloseCompose={openCompose.onFalse} />
  //     )}
  //   </Stack>
  // );

  return (
    <Stack
      flexGrow={1}
      sx={{
        width: 1,
        minWidth: 0,
        height: "76vh",
        borderRadius: 1.5,
        bgcolor: 'background.default',
      }}
    >
      {renderSubject}

      <Divider sx={{ borderStyle: 'dashed' }} />

      {/* {renderSender} */}

      {!!attachments.length && <Stack sx={{ px: 2 }}> {renderAttachments} </Stack>}

      {renderContent}

      {/* {renderEditor} */}
    </Stack>
  );
}

ContactUsDetails.propTypes = {
  currentUser: PropTypes.object,
  renderLabel: PropTypes.func,
};
