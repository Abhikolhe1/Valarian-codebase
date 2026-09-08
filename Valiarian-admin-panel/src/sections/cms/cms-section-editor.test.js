import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { SnackbarProvider } from 'notistack';
import axiosInstance, { endpoints } from 'src/utils/axios';

import CMSSectionEditor from './cms-section-editor';

// Browser-only media/lightbox, rich-text and remote icons are outside these
// section workflow tests. Keep the actual section forms and API payloads real.
jest.mock('./cms-media-picker', () => () => null);
jest.mock('src/components/editor', () => () => null);
jest.mock('src/components/iconify', () => () => <svg data-testid="cms-icon" />);
jest.mock('src/utils/axios', () => ({
  __esModule: true,
  ...jest.requireActual('src/utils/axios'),
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const onClose = jest.fn();
const onSave = jest.fn();
const saved = { id: 'section-1', name: 'My Hero', type: 'hero', content: { title: 'Welcome' } };
const show = (props = {}) => render(
  <SnackbarProvider><CMSSectionEditor open onClose={onClose} onSave={onSave} pageId="page-123" sectionType="hero" {...props} /></SnackbarProvider>
);
const submit = () => fireEvent.click(screen.getByRole('button', { name: /^(Create|Update) Section$/ }));
beforeEach(() => jest.resetAllMocks());

it.each([
  ['hero', 'Hero'], ['features', 'Features'], ['testimonials', 'Testimonials'],
  ['gallery', 'Gallery'], ['cta', 'Call to Action'], ['text', 'Text'],
])('renders the actual %s form', (type, title) => {
  show({ sectionType: type });
  expect(screen.getByText(`Create ${title} Section`)).toBeVisible();
  expect(screen.getByLabelText(/section name/i)).toBeInTheDocument();
});
it('does not render a closed editor', () => {
  show({ open: false });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('loads existing content for editing', () => {
  show({ section: saved });
  expect(screen.getByText('Edit Hero Section')).toBeVisible();
  expect(screen.getByLabelText('Section Name')).toHaveValue('My Hero');
  expect(screen.getByLabelText('Title')).toHaveValue('Welcome');
});
it.each(['Cancel', 'Close section editor'])('closes with %s without saving', (name) => {
  show();
  fireEvent.click(screen.getByRole('button', { name }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(axiosInstance.post).not.toHaveBeenCalled();
});
it('creates with the page ID, enabled flag and actual form content', async () => {
  axiosInstance.post.mockResolvedValue({ data: saved });
  show();
  fireEvent.change(screen.getByLabelText('Section Name'), { target: { value: 'My Hero' } });
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Welcome' } });
  submit();
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(saved));
  expect(axiosInstance.post).toHaveBeenCalledWith(endpoints.cms.sections.list, expect.objectContaining({
    pageId: 'page-123', enabled: true, type: 'hero', name: 'My Hero',
    content: expect.objectContaining({ title: 'Welcome', heading: 'Welcome' }),
  }));
  expect(axiosInstance.patch).not.toHaveBeenCalled();
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(await screen.findByText('Section created successfully!')).toBeInTheDocument();
});
it('updates the selected section without overwriting page or enabled state', async () => {
  axiosInstance.patch.mockResolvedValue({ data: saved });
  show({ section: saved });
  submit();
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(saved));
  expect(axiosInstance.patch).toHaveBeenCalledWith(endpoints.cms.sections.details(saved.id), expect.objectContaining({ name: 'My Hero', type: 'hero' }));
  const payload = axiosInstance.patch.mock.calls[0][1];
  expect(payload).not.toHaveProperty('pageId');
  expect(payload).not.toHaveProperty('enabled');
  expect(axiosInstance.post).not.toHaveBeenCalled();
  expect(onClose).toHaveBeenCalledTimes(1);
});
it.each(['create', 'update'])('keeps the %s form open after an API failure and allows retry', async (mode) => {
  const api = mode === 'create' ? axiosInstance.post : axiosInstance.patch;
  api.mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce({ data: saved });
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  show(mode === 'update' ? { section: saved } : {});
  submit();
  expect(await screen.findByText('Failed to save section')).toBeVisible();
  expect(onClose).not.toHaveBeenCalled();
  expect(onSave).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByRole('button', { name: /^(Create|Update) Section$/ })).toBeEnabled());
  submit();
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(saved));
  expect(api).toHaveBeenCalledTimes(2);
  log.mockRestore();
});
it('disables submit while a save is pending', async () => {
  let resolve;
  axiosInstance.post.mockImplementation(() => new Promise((done) => { resolve = done; }));
  show();
  submit();
  await waitFor(() => expect(axiosInstance.post).toHaveBeenCalledTimes(1));
  expect(screen.getByRole('button', { name: 'Create Section' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Close section editor' })).toBeDisabled();
  await act(async () => resolve({ data: saved }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(saved));
});
