import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import PropTypes from 'prop-types';
// @mui
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
// utils
import { fData } from 'src/utils/format-number';
//
import FileThumbnail, { fileData } from '../file-thumbnail';
import Iconify from '../iconify';

// ----------------------------------------------------------------------

export default function MultiFilePreviewSortable({ thumbnail, files, onRemove, onReorder, sx }) {
  const handleDragEnd = (result) => {
    if (!result.destination || !onReorder) return;

    const items = Array.from(files);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onReorder(items);
  };

  if (!files || files.length === 0) return null;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="images" direction={thumbnail ? 'horizontal' : 'vertical'}>
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={{
              display: 'flex',
              flexWrap: thumbnail ? 'wrap' : 'nowrap',
              flexDirection: thumbnail ? 'row' : 'column',
              gap: thumbnail ? 0 : 1,
              ...(snapshot.isDraggingOver && {
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                borderRadius: 1,
              }),
            }}
          >
            {files.map((file, index) => {
              const { key, name = '', size = 0 } = fileData(file);

              return (
                <Draggable key={key} draggableId={key} index={index}>
                  {(draggableProvided, draggableSnapshot) => (
                    <Box
                      ref={draggableProvided.innerRef}
                      {...draggableProvided.draggableProps}
                      {...draggableProvided.dragHandleProps}
                      sx={{
                        ...(draggableSnapshot.isDragging && {
                          opacity: 0.8,
                        }),
                      }}
                    >
                      {thumbnail ? (
                        <Stack
                          alignItems="center"
                          display="inline-flex"
                          justifyContent="center"
                          sx={{
                            m: 0.5,
                            width: 80,
                            height: 80,
                            borderRadius: 1.25,
                            overflow: 'hidden',
                            position: 'relative',
                            border: (theme) => `solid 1px ${alpha(theme.palette.grey[500], 0.16)}`,
                            cursor: 'grab',
                            '&:active': {
                              cursor: 'grabbing',
                            },
                            ...(snapshot.isDragging && {
                              boxShadow: (theme) => theme.customShadows.z8,
                              border: (theme) => `solid 2px ${theme.palette.primary.main}`,
                            }),
                            ...sx,
                          }}
                        >
                          <FileThumbnail
                            tooltip
                            imageView
                            file={file}
                            sx={{ position: 'absolute' }}
                            imgSx={{ position: 'absolute' }}
                          />

                          {/* Drag Handle Icon */}
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 4,
                              left: 4,
                              zIndex: 9,
                              color: 'common.white',
                              bgcolor: (theme) => alpha(theme.palette.grey[900], 0.48),
                              borderRadius: 0.5,
                              p: 0.25,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Iconify icon="nimbus:drag-dots" width={14} />
                          </Box>

                          {/* Image Index Badge */}
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 4,
                              left: 4,
                              zIndex: 9,
                              color: 'common.white',
                              bgcolor: (theme) => alpha(theme.palette.grey[900], 0.72),
                              borderRadius: 0.5,
                              px: 0.75,
                              py: 0.25,
                              fontSize: 10,
                              fontWeight: 600,
                            }}
                          >
                            {index + 1}
                          </Box>

                          {onRemove && (
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemove(file);
                              }}
                              sx={{
                                p: 0.5,
                                top: 4,
                                right: 4,
                                position: 'absolute',
                                color: 'common.white',
                                bgcolor: (theme) => alpha(theme.palette.grey[900], 0.48),
                                '&:hover': {
                                  bgcolor: (theme) => alpha(theme.palette.grey[900], 0.72),
                                },
                              }}
                            >
                              <Iconify icon="mingcute:close-line" width={14} />
                            </IconButton>
                          )}
                        </Stack>
                      ) : (
                        <Stack
                          spacing={2}
                          direction="row"
                          alignItems="center"
                          sx={{
                            my: 1,
                            py: 1,
                            px: 1.5,
                            borderRadius: 1,
                            border: (theme) => `solid 1px ${alpha(theme.palette.grey[500], 0.16)}`,
                            cursor: 'grab',
                            '&:active': {
                              cursor: 'grabbing',
                            },
                            ...(snapshot.isDragging && {
                              boxShadow: (theme) => theme.customShadows.z8,
                              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                            }),
                            ...sx,
                          }}
                        >
                          <Iconify icon="nimbus:drag-dots" width={20} sx={{ color: 'text.disabled' }} />

                          <FileThumbnail file={file} />

                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Box sx={{ typography: 'body2', noWrap: true }}>{name}</Box>
                            <Box sx={{ typography: 'caption', color: 'text.secondary' }}>
                              {fData(size)}
                            </Box>
                          </Box>

                          {onRemove && (
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemove(file);
                              }}
                            >
                              <Iconify icon="mingcute:close-line" width={16} />
                            </IconButton>
                          )}
                        </Stack>
                      )}
                    </Box>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </Box>
        )}
      </Droppable>
    </DragDropContext>
  );
}

MultiFilePreviewSortable.propTypes = {
  files: PropTypes.array,
  onRemove: PropTypes.func,
  onReorder: PropTypes.func,
  sx: PropTypes.object,
  thumbnail: PropTypes.bool,
};
