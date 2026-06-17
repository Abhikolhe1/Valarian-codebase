-- CMS System Database Schema Rollback Migration
-- This migration removes all CMS tables and schema

-- Drop all indexes first
DROP INDEX IF EXISTS cms.idx_navigation_menus_enabled;
DROP INDEX IF EXISTS cms.idx_navigation_menus_location;
DROP INDEX IF EXISTS cms.idx_section_templates_is_active;
DROP INDEX IF EXISTS cms.idx_section_templates_type;
DROP INDEX IF EXISTS cms.idx_content_versions_page_id_version;
DROP INDEX IF EXISTS cms.idx_content_versions_page_id;
DROP INDEX IF EXISTS cms.idx_media_filename;
DROP INDEX IF EXISTS cms.idx_media_created_at;
DROP INDEX IF EXISTS cms.idx_media_mime_type;
DROP INDEX IF EXISTS cms.idx_media_folder;
DROP INDEX IF EXISTS cms.idx_sections_enabled;
DROP INDEX IF EXISTS cms.idx_sections_type;
DROP INDEX IF EXISTS cms.idx_sections_page_id_order;
DROP INDEX IF EXISTS cms.idx_sections_page_id;
DROP INDEX IF EXISTS cms.idx_pages_created_at;
DROP INDEX IF EXISTS cms.idx_pages_published_at;
DROP INDEX IF EXISTS cms.idx_pages_status;
DROP INDEX IF EXISTS cms.idx_pages_slug;

-- Drop all tables (order matters due to foreign keys)
DROP TABLE IF EXISTS cms.site_settings CASCADE;
DROP TABLE IF EXISTS cms.navigation_menus CASCADE;
DROP TABLE IF EXISTS cms.section_templates CASCADE;
DROP TABLE IF EXISTS cms.content_versions CASCADE;
DROP TABLE IF EXISTS cms.media CASCADE;
DROP TABLE IF EXISTS cms.sections CASCADE;
DROP TABLE IF EXISTS cms.pages CASCADE;

-- Drop the schema
DROP SCHEMA IF EXISTS cms CASCADE;
