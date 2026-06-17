/**
 * Demo component showing React Query CMS hooks usage
 * This file demonstrates how to use the new React Query hooks
 * alongside the existing SWR hooks
 */

import {
  useInvalidateCMS,
  useMedia,
  useMediaItem,
  useNavigation,
  usePage,
  usePageBySlug,
  usePages,
  usePageVersions,
  useSection,
  useSections,
  useSettings,
} from './cms-query';

// ----------------------------------------------------------------------
// PAGES EXAMPLES
// ----------------------------------------------------------------------

/**
 * Example: Fetch all pages with filtering
 */
export function PagesListDemo() {
  const { data, isLoading, error, refetch } = usePages({
    status: 'published',
    page: 1,
    limit: 10,
  });

  if (isLoading) return <div>Loading pages...</div>;
  if (error) return <div>Error loading pages: {error?.error?.message}</div>;

  return (
    <div>
      <h2>Pages ({data?.pages?.length || 0})</h2>
      <button onClick={() => refetch()}>Refresh</button>
      <ul>
        {data?.pages?.map((page) => (
          <li key={page.id}>
            {page.title} - {page.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Example: Fetch single page by ID
 */
export function PageDetailDemo({ pageId }) {
  const { data, isLoading, error } = usePage(pageId);

  if (isLoading) return <div>Loading page...</div>;
  if (error) return <div>Error: {error?.error?.message}</div>;

  return (
    <div>
      <h1>{data?.page?.title}</h1>
      <p>{data?.page?.description}</p>
      <p>Status: {data?.page?.status}</p>
    </div>
  );
}

/**
 * Example: Fetch page by slug (for public pages)
 */
export function PublicPageDemo({ slug }) {
  const { data, isLoading, error } = usePageBySlug(slug);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error?.error?.message}</div>;

  return (
    <div>
      <h1>{data?.page?.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: data?.page?.content }} />
    </div>
  );
}

/**
 * Example: Fetch page versions
 */
export function VersionHistoryDemo({ pageId }) {
  const { data, isLoading, error } = usePageVersions(pageId);

  if (isLoading) return <div>Loading versions...</div>;
  if (error) return <div>Error: {error?.error?.message}</div>;

  return (
    <div>
      <h3>Version History</h3>
      <ul>
        {data?.versions?.map((version) => (
          <li key={version.id}>
            v{version.version} - {new Date(version.createdAt).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ----------------------------------------------------------------------
// SECTIONS EXAMPLES
// ----------------------------------------------------------------------

/**
 * Example: Fetch sections for a page
 */
export function SectionsListDemo({ pageId }) {
  const { data, isLoading, error } = useSections(pageId);

  if (isLoading) return <div>Loading sections...</div>;
  if (error) return <div>Error: {error?.error?.message}</div>;

  return (
    <div>
      <h3>Sections</h3>
      {data?.sections?.map((section) => (
        <div key={section.id}>
          <strong>{section.name}</strong> ({section.type})
        </div>
      ))}
    </div>
  );
}

/**
 * Example: Fetch single section
 */
export function SectionDetailDemo({ sectionId }) {
  const { data, isLoading, error } = useSection(sectionId);

  if (isLoading) return <div>Loading section...</div>;
  if (error) return <div>Error: {error?.error?.message}</div>;

  return (
    <div>
      <h3>{data?.section?.name}</h3>
      <p>Type: {data?.section?.type}</p>
      <p>Order: {data?.section?.order}</p>
    </div>
  );
}

// ----------------------------------------------------------------------
// MEDIA EXAMPLES
// ----------------------------------------------------------------------

/**
 * Example: Fetch media library
 */
export function MediaLibraryDemo() {
  const { data, isLoading, error } = useMedia({
    page: 1,
    limit: 12,
  });

  if (isLoading) return <div>Loading media...</div>;
  if (error) return <div>Error: {error?.error?.message}</div>;

  return (
    <div>
      <h3>Media Library ({data?.totalCount || 0} items)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {data?.media?.map((item) => (
          <div key={item.id}>
            <img src={item.thumbnailUrl} alt={item.altText} style={{ width: '100%' }} />
            <p>{item.filename}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Example: Fetch single media item
 */
export function MediaDetailDemo({ mediaId }) {
  const { data, isLoading, error } = useMediaItem(mediaId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error?.error?.message}</div>;

  return (
    <div>
      <img src={data?.media?.url} alt={data?.media?.altText} style={{ maxWidth: '100%' }} />
      <p>{data?.media?.caption}</p>
      <p>Size: {(data?.media?.size / 1024).toFixed(2)} KB</p>
    </div>
  );
}

// ----------------------------------------------------------------------
// NAVIGATION EXAMPLES
// ----------------------------------------------------------------------

/**
 * Example: Fetch navigation menu
 */
export function NavigationDemo({ location = 'header' }) {
  const { data, isLoading, error } = useNavigation(location);

  if (isLoading) return <div>Loading navigation...</div>;
  if (error) return <div>Error: {error?.error?.message}</div>;

  return (
    <nav>
      <ul>
        {data?.navigation?.items?.map((item) => (
          <li key={item.id}>
            <a href={item.url}>{item.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ----------------------------------------------------------------------
// SETTINGS EXAMPLES
// ----------------------------------------------------------------------

/**
 * Example: Fetch site settings
 */
export function SettingsDemo() {
  const { data, isLoading, error } = useSettings();

  if (isLoading) return <div>Loading settings...</div>;
  if (error) return <div>Error: {error?.error?.message}</div>;

  return (
    <div>
      <h3>{data?.settings?.siteName}</h3>
      <p>{data?.settings?.siteDescription}</p>
      <div>
        <h4>Social Media</h4>
        <a href={data?.settings?.socialMedia?.facebook}>Facebook</a>
        <a href={data?.settings?.socialMedia?.instagram}>Instagram</a>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// CACHE INVALIDATION EXAMPLE
// ----------------------------------------------------------------------

/**
 * Example: Cache invalidation after mutations
 */
export function PageActionsDemo({ pageId }) {
  const invalidate = useInvalidateCMS();

  const handlePublish = async () => {
    try {
      // Simulate publish API call
      // await publishPage(pageId);

      // Invalidate relevant caches
      invalidate.invalidatePage(pageId);
      invalidate.invalidatePages();

      console.log('Page published and cache invalidated');
    } catch (error) {
      console.error('Error publishing page:', error);
    }
  };

  const handleUpdate = async () => {
    try {
      // Simulate update API call
      // await updatePage(pageId, data);

      // Invalidate all CMS cache
      invalidate.invalidateAll();

      console.log('Page updated and all cache invalidated');
    } catch (error) {
      console.error('Error updating page:', error);
    }
  };

  return (
    <div>
      <button onClick={handlePublish}>Publish Page</button>
      <button onClick={handleUpdate}>Update Page</button>
    </div>
  );
}

// ----------------------------------------------------------------------
// DEPENDENT QUERIES EXAMPLE
// ----------------------------------------------------------------------

/**
 * Example: Dependent queries (fetch page, then sections)
 */
export function PageWithSectionsDemo({ slug }) {
  // First fetch the page
  const { data: pageData, isLoading: pageLoading } = usePageBySlug(slug);

  // Then fetch sections (only when page is loaded)
  const { data: sectionsData, isLoading: sectionsLoading } = useSections(pageData?.page?.id, {
    enabled: !!pageData?.page?.id, // Only run when pageId exists
  });

  if (pageLoading) return <div>Loading page...</div>;
  if (sectionsLoading) return <div>Loading sections...</div>;

  return (
    <div>
      <h1>{pageData?.page?.title}</h1>
      <div>
        {sectionsData?.sections?.map((section) => (
          <div key={section.id}>
            <h2>{section.name}</h2>
            {/* Render section content */}
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// COMPARISON: SWR vs React Query
// ----------------------------------------------------------------------

/**
 * Example showing both SWR and React Query side by side
 */
export function ComparisonDemo({ pageId }) {
  // Using React Query (new)
  const {
    data: rqData,
    isLoading: rqLoading,
    error: rqError,
  } = usePage(pageId);

  // Using SWR (existing) - would need to import from cms.js
  // const { page, pageLoading, pageError } = useGetPage(pageId);

  return (
    <div>
      <h3>React Query Result:</h3>
      {rqLoading && <p>Loading...</p>}
      {rqError && <p>Error: {rqerror?.error?.message}</p>}
      {rqData && <p>Title: {rqData?.page?.title}</p>}

      {/* SWR result would be similar */}
    </div>
  );
}
