import { fireEvent, render, screen, within } from '@testing-library/react';
import { SnackbarProvider } from 'notistack';

import CMSSectionTypeSelector from './cms-section-type-selector';

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

const types = [
  ['premium-hero', 'Premium Hero'], ['premium-product-showcase', 'Premium Product Showcase'],
  ['premium-fabric-details', 'Premium Fabric Details'], ['premium-statement', 'Premium Statement'],
  ['premium-feature-grid', 'Premium Feature Grid'], ['premium-confidence', 'Premium Confidence'],
  ['premium-reserve-cta', 'Premium Reserve CTA'], ['premium-countdown', 'Premium Countdown'],
  ['hero', 'Hero Section'], ['scroll-animated', 'Scroll Animated'],
  ['new-arrivals', 'New Arrivals'], ['collection-hero', 'Collection Hero'],
  ['best-sellers', 'Best Sellers'], ['fabric-info', 'Fabric Information'],
  ['social-media', 'Social Media'], ['features', 'Features Section'],
  ['testimonials', 'Testimonials Section'], ['gallery', 'Gallery Section'],
  ['cta', 'Call to Action'], ['text', 'Text Section'], ['custom', 'Custom Section'],
];
const onClose = jest.fn();
const onSelect = jest.fn();
const show = (open = true) => render(
  <SnackbarProvider><CMSSectionTypeSelector open={open} onClose={onClose} onSelect={onSelect} /></SnackbarProvider>
);
beforeEach(() => jest.clearAllMocks());

it('renders the open dialog and instructions', () => {
  show();
  expect(screen.getByText('Choose Section Type')).toBeVisible();
  expect(screen.getByText(/select a section type to add to your page/i)).toBeVisible();
});
it('does not render a closed dialog', () => {
  show(false);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it.each(types)('selects %s and closes exactly once', (type, label) => {
  show();
  fireEvent.click(screen.getByText(label));
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith(type);
  expect(onClose).toHaveBeenCalledTimes(1);
});
it('renders all 21 type cards and the template library card inside the portal', () => {
  show();
  const dialog = screen.getByRole('dialog');
  expect(dialog.querySelectorAll('.MuiCard-root')).toHaveLength(22);
  types.forEach(([, label]) => {
    const card = within(dialog).getByText(label).closest('.MuiCard-root');
    expect(within(card).getByTestId('cms-icon')).toBeInTheDocument();
  });
});
it('displays section descriptions', () => {
  show();
  expect(screen.getByText(/Large banner with background image\/video, heading, and CTA buttons/i)).toBeVisible();
  expect(screen.getByText(/Showcase product features with icons, titles, and descriptions/i)).toBeVisible();
});
it.each(['Cancel', 'Close section type selector'])('closes with %s without selecting', (name) => {
  show();
  fireEvent.click(screen.getByRole('button', { name }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onSelect).not.toHaveBeenCalled();
});
