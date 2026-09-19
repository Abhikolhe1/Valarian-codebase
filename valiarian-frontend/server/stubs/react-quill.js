// Quill reads `document` during module initialization. The public SSR routes
// never render the admin/editor field, but an existing barrel export imports it.
export default function ServerQuillPlaceholder() {
  return null;
}
