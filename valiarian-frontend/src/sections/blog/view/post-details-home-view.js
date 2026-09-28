// @mui
import Chip from '@mui/material/Chip';
import { Helmet } from 'react-helmet-async';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
// routes
import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hook';
import { RouterLink } from 'src/routes/components';
// utils
// api
import { useGetPost, useGetLatestPosts } from 'src/api/blog';
// components
import Iconify from 'src/components/iconify';
import Markdown from 'src/components/markdown';
import EmptyContent from 'src/components/empty-content';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import PostList from '../post-list';
import PostDetailsHero from '../post-details-hero';
import { PostDetailsSkeleton } from '../post-skeleton';

// ----------------------------------------------------------------------

export default function PostDetailsHomeView() {
  const params = useParams();

  const { title } = params;

  const { post, postError, postLoading } = useGetPost(`${title}`);

  const { latestPosts, latestPostsLoading } = useGetLatestPosts(`${title}`);

  const renderSkeleton = <PostDetailsSkeleton />;

  const renderError = (
    <Container sx={{ my: 10 }}>
      <EmptyContent
        filled
        title={`${postError?.message}`}
        action={
          <Button
            component={RouterLink}
            href={paths.post.root}
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={16} />}
            sx={{ mt: 3 }}
          >
            Back to List
          </Button>
        }
        sx={{ py: 10 }}
      />
    </Container>
  );

  const renderPost = post && (
    <>
      <Helmet>
        <title>{post.metaTitle || post.title}</title>
        <meta name="description" content={post.metaDescription || post.description} />
        <meta name="robots" content={post.noIndex ? 'noindex,nofollow' : 'index,follow'} />
        <link rel="canonical" href={post.canonicalUrl || `https://valiarian.com/blog/${post.slug}`} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.metaTitle || post.title} />
        <meta property="og:description" content={post.metaDescription || post.description} />
        <meta property="og:image" content={post.coverUrl} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            description: post.metaDescription || post.description,
            image: post.coverUrl ? [post.coverUrl] : undefined,
            datePublished: post.publishedAt || post.createdAt,
            dateModified: post.updatedAt,
            author: { '@type': 'Organization', name: post.author?.name || 'Valiarian' },
            publisher: { '@type': 'Organization', name: 'Valiarian', url: 'https://valiarian.com' },
            mainEntityOfPage: post.canonicalUrl || `https://valiarian.com/blog/${post.slug}`,
          })}
        </script>
      </Helmet>
      <PostDetailsHero
        title={post.title}
        author={post.author}
        coverUrl={post.coverUrl}
        createdAt={post.createdAt}
      />

      <Container
        maxWidth={false}
        sx={{
          py: 3,
          mb: 5,
          borderBottom: (theme) => `solid 1px ${theme.palette.divider}`,
        }}
      >
        <CustomBreadcrumbs
          links={[
            {
              name: 'Home',
              href: '/',
            },
            {
              name: 'Blog',
              href: paths.post.root,
            },
            {
              name: post?.title,
            },
          ]}
          sx={{ maxWidth: 720, mx: 'auto' }}
        />
      </Container>

      <Container maxWidth={false}>
        <Stack sx={{ maxWidth: 720, mx: 'auto' }}>
          <Typography variant="subtitle1" sx={{ mb: 5 }}>
            {post.description}
          </Typography>

          <Markdown children={post.content} />

          <Stack spacing={3} sx={{ py: 3, borderTop: (theme) => `dashed 1px ${theme.palette.divider}` }}>
            <Stack direction="row" flexWrap="wrap" spacing={1}>
              {(post.tags || []).map((tag) => (
                <Chip key={tag} label={tag} variant="soft" />
              ))}
            </Stack>
          </Stack>

        </Stack>
      </Container>
    </>
  );

  const renderLatestPosts = (
    <>
      <Typography variant="h4" sx={{ mb: 5 }}>
        Recent Posts
      </Typography>

      <PostList
        posts={latestPosts.slice(latestPosts.length - 4)}
        loading={latestPostsLoading}
        disabledIndex
      />
    </>
  );

  return (
    <>
      {postLoading && renderSkeleton}

      {postError && renderError}

      {post && renderPost}

      <Container sx={{ pb: 15 }}>{!!latestPosts.length && renderLatestPosts}</Container>
    </>
  );
}
