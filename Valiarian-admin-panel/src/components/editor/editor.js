import PropTypes from 'prop-types';
import { useMemo, useRef } from 'react';
import 'src/utils/highlight';
import ReactQuill from 'react-quill';
// @mui
import { alpha } from '@mui/material/styles';
//
import { StyledEditor } from './styles';
import Toolbar, { formats } from './toolbar';

// ----------------------------------------------------------------------

export default function Editor({
  id = 'valiarian-quill',
  error,
  simple = false,
  helperText,
  sx,
  uploadImage,
  ...other
}) {
  const editorRef = useRef(null);

  const modules = useMemo(() => ({
    toolbar: {
      container: `#${id}`,
      handlers: uploadImage
        ? {
            image: () => {
              const input = document.createElement('input');
              input.setAttribute('type', 'file');
              input.setAttribute('accept', 'image/*');
              input.click();
              input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) return;
                const uploaded = await uploadImage(file);
                const url = typeof uploaded === 'string' ? uploaded : uploaded?.url;
                const editor = editorRef.current?.getEditor();
                const range = editor?.getSelection(true);
                if (editor && url) {
                  editor.insertEmbed(range?.index || 0, 'image', url, 'user');
                  const image = [...editor.root.querySelectorAll('img')].find(
                    (item) => item.getAttribute('src') === url
                  );
                  if (image && uploaded?.alt) image.setAttribute('alt', uploaded.alt);
                }
              };
            },
          }
        : undefined,
    },
    history: {
      delay: 500,
      maxStack: 100,
      userOnly: true,
    },
    syntax: true,
    clipboard: {
      matchVisual: false,
    },
  }), [id, uploadImage]);

  return (
    <>
      <StyledEditor
        sx={{
          ...(error && {
            border: (theme) => `solid 1px ${theme.palette.error.main}`,
            '& .ql-editor': {
              bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
            },
          }),
          ...sx,
        }}
      >
        <Toolbar id={id} isSimple={simple} />

        <ReactQuill
          ref={editorRef}
          modules={modules}
          formats={formats}
          placeholder="Write something awesome..."
          {...other}
        />
      </StyledEditor>

      {helperText && helperText}
    </>
  );
}

Editor.propTypes = {
  error: PropTypes.bool,
  helperText: PropTypes.object,
  id: PropTypes.string,
  simple: PropTypes.bool,
  sx: PropTypes.object,
  uploadImage: PropTypes.func,
};
