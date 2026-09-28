CREATE SCHEMA IF NOT EXISTS cms;

CREATE TABLE IF NOT EXISTS cms.blog_posts (
  id uuid PRIMARY KEY,
  title varchar(180) NOT NULL,
  slug varchar(200) NOT NULL UNIQUE,
  excerpt varchar(500) NOT NULL,
  content text NOT NULL,
  cover_url text,
  cover_alt varchar(250),
  author_name varchar(120) NOT NULL DEFAULT 'Valiarian Editorial Team',
  author_avatar_url text,
  category varchar(100),
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'archived')),
  published_at timestamptz,
  scheduled_at timestamptz,
  meta_title varchar(70),
  meta_description varchar(170),
  meta_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  canonical_url text,
  no_index boolean NOT NULL DEFAULT false,
  total_views integer NOT NULL DEFAULT 0,
  reading_minutes integer NOT NULL DEFAULT 1,
  created_by varchar(100),
  updated_by varchar(100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_posts_status_idx ON cms.blog_posts(status);
CREATE INDEX IF NOT EXISTS blog_posts_published_at_idx ON cms.blog_posts(published_at DESC);
