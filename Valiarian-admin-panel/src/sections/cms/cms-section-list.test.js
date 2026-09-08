import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { SnackbarProvider } from 'notistack';
import axiosInstance, { endpoints } from 'src/utils/axios';

import { DragDropContext } from '@hello-pangea/dnd';
import CMSSectionList from './cms-section-list';

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

// Capture the DnD library's callback while still rendering its real components.
// These tests verify persistence/rollback; browser pointer geometry is separate.
jest.mock('@hello-pangea/dnd', () => {
  const actual = jest.requireActual('@hello-pangea/dnd');
  const React = jest.requireActual('react');
  return { ...actual, DragDropContext: jest.fn((props) => React.createElement(actual.DragDropContext, props)) };
});
const sections = [
  { id: '1', pageId: 'page-1', type: 'hero', name: 'Hero Section', order: 0, enabled: true, content: { title: 'Welcome' }, settings: {} },
  { id: '2', pageId: 'page-1', type: 'features', name: 'Features Section', order: 1, enabled: true, content: {}, settings: {} },
  { id: '3', pageId: 'page-1', type: 'testimonials', name: 'Testimonials Section', order: 2, enabled: false, content: {}, settings: {} },
];
const onSectionsChange = jest.fn();
const show = (items = sections) => render(
  <SnackbarProvider><CMSSectionList pageId="page-1" sections={items} onSectionsChange={onSectionsChange} /></SnackbarProvider>
);
const drag = async (destination) => {
  const { onDragEnd } = DragDropContext.mock.calls[DragDropContext.mock.calls.length - 1][0];
  await act(async () => onDragEnd({ source: { index: 0 }, destination }));
};
beforeEach(() => {
  jest.clearAllMocks();
  DragDropContext.mockImplementation((props) => {
    const React = jest.requireActual('react');
    return React.createElement(jest.requireActual('@hello-pangea/dnd').DragDropContext, props);
  });
  Object.values(axiosInstance).forEach((method) => method.mockReset());
});
afterEach(() => jest.restoreAllMocks());

it('shows the empty state and add action', () => {
  show([]);
  expect(screen.getByText(/No sections yet/i)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Add Section' })).toBeVisible();
});
it('renders names, type badges, count, ordering and enabled states', () => {
  show();
  expect(screen.getByText('3 sections')).toBeVisible();
  sections.forEach((section, index) => {
    expect(screen.getByText(section.name)).toBeVisible();
    expect(screen.getByText(`Order: ${index + 1}`)).toBeVisible();
    expect(screen.getByRole('button', { name: `Reorder ${section.name}` })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: `Enable ${section.name}` }).checked).toBe(section.enabled);
  });
  ['Hero', 'Features', 'Testimonials'].forEach((label) => expect(screen.getByText(label)).toBeVisible());
});
it('persists an enabled-state change and updates only that section', async () => {
  axiosInstance.patch.mockResolvedValue({ data: { enabled: false } });
  show();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Enable Hero Section' }));
  await waitFor(() => expect(onSectionsChange).toHaveBeenCalledWith([{ ...sections[0], enabled: false }, ...sections.slice(1)]));
  expect(axiosInstance.patch).toHaveBeenCalledWith(endpoints.cms.sections.details('1'), { enabled: false });
});
it('keeps sections unchanged when toggling fails', async () => {
  axiosInstance.patch.mockRejectedValue(new Error('Unavailable'));
  jest.spyOn(console, 'error').mockImplementation(() => {});
  show();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Enable Hero Section' }));
  expect(await screen.findByText('Failed to update section')).toBeVisible();
  expect(onSectionsChange).not.toHaveBeenCalled();
});
it('does not reuse a cancelled template when editing an existing section', async () => {
  axiosInstance.get.mockResolvedValue({ data: { hero: [{ id: 'template-1', type: 'hero', name: 'Welcome template', defaultContent: { title: 'From template' } }] } });
  show();
  fireEvent.click(screen.getByRole('button', { name: 'Add Section' }));
  fireEvent.click(screen.getByText('Browse Template Library'));
  fireEvent.click(await screen.findByText('Welcome template'));
  expect(screen.getByLabelText('Title')).toHaveValue('From template');
  fireEvent.click(screen.getByRole('button', { name: 'Close section editor' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  fireEvent.click(screen.getAllByRole('button', { name: 'Edit section' })[0]);
  expect(screen.getByLabelText('Title')).toHaveValue('Welcome');
  expect(axiosInstance.post).not.toHaveBeenCalled();
  expect(axiosInstance.patch).not.toHaveBeenCalled();
});
it('opens the actual editor with the selected content and replaces only the saved section', async () => {
  const saved = { ...sections[0], name: 'Updated Hero' };
  axiosInstance.patch.mockResolvedValue({ data: saved });
  show();
  fireEvent.click(screen.getAllByRole('button', { name: 'Edit section' })[0]);
  expect(screen.getByText('Edit Hero Section')).toBeVisible();
  expect(screen.getByLabelText('Title')).toHaveValue('Welcome');
  fireEvent.change(screen.getByLabelText('Section Name'), { target: { value: saved.name } });
  fireEvent.click(screen.getByRole('button', { name: 'Update Section' }));
  await waitFor(() => expect(onSectionsChange).toHaveBeenCalledWith([saved, ...sections.slice(1)]));
});
it('confirms deletion and removes only the requested section after success', async () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
  axiosInstance.delete.mockResolvedValue({});
  show();
  fireEvent.click(screen.getAllByRole('button', { name: 'Delete section' })[0]);
  expect(confirm).toHaveBeenCalledWith('Are you sure you want to delete this section?');
  await waitFor(() => expect(onSectionsChange).toHaveBeenCalledWith(sections.slice(1)));
  expect(axiosInstance.delete).toHaveBeenCalledWith(endpoints.cms.sections.details('1'));
});
it('does not delete when confirmation is cancelled', () => {
  jest.spyOn(window, 'confirm').mockReturnValue(false);
  show();
  fireEvent.click(screen.getAllByRole('button', { name: 'Delete section' })[0]);
  expect(axiosInstance.delete).not.toHaveBeenCalled();
  expect(onSectionsChange).not.toHaveBeenCalled();
});
it('preserves sections when deletion fails', async () => {
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  jest.spyOn(console, 'error').mockImplementation(() => {});
  axiosInstance.delete.mockRejectedValue(new Error('Unavailable'));
  show();
  fireEvent.click(screen.getAllByRole('button', { name: 'Delete section' })[0]);
  expect(await screen.findByText('Failed to delete section')).toBeVisible();
  expect(onSectionsChange).not.toHaveBeenCalled();
});
it('opens the supported Save as Template action', () => {
  show();
  fireEvent.click(screen.getAllByRole('button', { name: 'Save as template' })[0]);
  expect(screen.getByRole('dialog')).toHaveTextContent(/save.*template/i);
});
it('reorders optimistically and persists the exact ordered IDs', async () => {
  axiosInstance.patch.mockResolvedValue({});
  show();
  await drag({ index: 2 });
  expect(onSectionsChange).toHaveBeenCalledWith([sections[1], sections[2], sections[0]].map((section, order) => ({ ...section, order })));
  expect(axiosInstance.patch).toHaveBeenCalledWith(endpoints.cms.sections.reorder, { pageId: 'page-1', sectionIds: ['2', '3', '1'] });
  expect(screen.getByText('Section reordered successfully')).toBeVisible();
});
it('rolls back the optimistic reorder when persistence fails', async () => {
  axiosInstance.patch.mockRejectedValue(new Error('Unavailable'));
  jest.spyOn(console, 'error').mockImplementation(() => {});
  show();
  await drag({ index: 2 });
  expect(onSectionsChange).toHaveBeenCalledTimes(2);
  expect(onSectionsChange).toHaveBeenLastCalledWith(sections);
  expect(screen.getByText('Failed to reorder section')).toBeVisible();
});
it.each([null, { index: 0 }])('does not persist a cancelled or unchanged drag (%j)', async (destination) => {
  show();
  await drag(destination);
  expect(axiosInstance.patch).not.toHaveBeenCalled();
  expect(onSectionsChange).not.toHaveBeenCalled();
});
it('selecting a type opens the editor but only saving adds a section', async () => {
  const saved = { ...sections[0], id: 'new' };
  axiosInstance.post.mockResolvedValue({ data: saved });
  show([]);
  fireEvent.click(screen.getByRole('button', { name: 'Add Section' }));
  fireEvent.click(screen.getByText('Hero Section'));
  expect(screen.getByText('Create Hero Section')).toBeVisible();
  expect(onSectionsChange).not.toHaveBeenCalled();
  expect(axiosInstance.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Create Section' }));
  await waitFor(() => expect(onSectionsChange).toHaveBeenCalledWith([saved]));
});
it('cancels the selector without opening an editor or saving', async () => {
  show([]);
  fireEvent.click(screen.getByRole('button', { name: 'Add Section' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(screen.queryByText('Choose Section Type')).not.toBeInTheDocument());
  expect(axiosInstance.post).not.toHaveBeenCalled();
  expect(onSectionsChange).not.toHaveBeenCalled();
});
it.each([{ label: 'empty', items: [] }, { label: 'populated', items: sections }])('loads template content on $label pages', async ({ items }) => {
  axiosInstance.get.mockResolvedValue({ data: { hero: [{ id: 'template-1', type: 'hero', name: 'Welcome template', defaultContent: { title: 'From template' } }] } });
  show(items);
  fireEvent.click(screen.getByRole('button', { name: 'Add Section' }));
  fireEvent.click(screen.getByText('Browse Template Library'));
  fireEvent.click(await screen.findByText('Welcome template'));
  expect(screen.getByText('Create from Template: Welcome template')).toBeVisible();
  expect(screen.getByLabelText('Title')).toHaveValue('From template');
  expect(axiosInstance.post).not.toHaveBeenCalled();
  expect(onSectionsChange).not.toHaveBeenCalled();
});
