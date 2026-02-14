-- ============================================
-- Database Initialization Script
-- Freelance AI Agents Marketplace
-- ============================================
--
-- This script is automatically executed when PostgreSQL
-- container starts for the first time.
--
-- It sets up the database with required extensions,
-- initial schemas, and optional sample data.
-- ============================================

-- ============================================
-- Extensions
-- ============================================

-- Enable UUID support (if not already available in PG15+)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for advanced text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable unaccent for accent-insensitive searches
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Enable citext for case-insensitive comparisons
CREATE EXTENSION IF NOT EXISTS citext;

-- ============================================
-- Create Database Schemas (Optional)
-- ============================================

-- Separate schema for application tables
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS analytics;

-- Grant permissions
GRANT USAGE ON SCHEMA app TO PUBLIC;
GRANT USAGE ON SCHEMA audit TO PUBLIC;
GRANT USAGE ON SCHEMA analytics TO PUBLIC;

-- ============================================
-- Create Enum Types
-- ============================================

DO $$
BEGIN
    -- User roles
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('client', 'agent', 'admin');
    END IF;

    -- Project status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
        CREATE TYPE project_status AS ENUM (
            'draft', 'open', 'in_progress', 'review', 'completed', 
            'cancelled', 'on_hold', 'disputed'
        );
    END IF;

    -- Job/Project type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_type') THEN
        CREATE TYPE job_type AS ENUM (
            'one_time', 'hourly', 'milestone', 'contract'
        );
    END IF;

    -- Payment status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM (
            'pending', 'processing', 'completed', 'failed', 'refunded', 'disputed'
        );
    END IF;

    -- Proposal status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proposal_status') THEN
        CREATE TYPE proposal_status AS ENUM (
            'draft', 'submitted', 'withdrawn', 'accepted', 'rejected'
        );
    END IF;

    -- Rating type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rating_target') THEN
        CREATE TYPE rating_target AS ENUM (
            'agent_to_client', 'client_to_agent', 'project', 'agent'
        );
    END IF;

    -- Notification type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM (
            'project_invitation', 'proposal_received', 'proposal_accepted', 
            'proposal_rejected', 'payment_received', 'project_completed',
            'message_received', 'review_received', 'system_update'
        );
    END IF;

    -- Agent skill level
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'skill_level') THEN
        CREATE TYPE skill_level AS ENUM (
            'beginner', 'intermediate', 'advanced', 'expert', 'master'
        );
    END IF;

    -- AI capability category
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_category') THEN
        CREATE TYPE ai_category AS ENUM (
            'nlp', 'computer_vision', 'data_analysis', 'automation', 
            'generative_ai', 'machine_learning', 'other'
        );
    END IF;
END $$;

-- ============================================
-- Create Tables (Basic Structure)
-- ============================================

-- Note: The full table creation is handled by
-- the backend migration system. This script only
-- sets up the database environment.

-- ============================================
-- Create Indexes for Performance
-- ============================================

-- Full-text search indexes (will be created by migrations)

-- ============================================
-- Create Functions
-- ============================================

-- Function to generate UUID if needed
CREATE OR REPLACE FUNCTION generate_public_id()
RETURNS uuid AS $$
BEGIN
    RETURN uuid_generate_v4();
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Initial System Configuration
-- ============================================

-- Insert system settings if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'app' AND table_name = 'settings') THEN
        INSERT INTO app.settings (key, value, description)
        VALUES
            ('site.name', 'Freelance AI Marketplace', 'Application name'),
            ('site.url', 'https://freelance-marketplace.com', 'Base URL'),
            ('maintenance.mode', 'false', 'Maintenance mode on/off'),
            ('registration.enabled', 'true', 'Allow new user registrations')
        ON CONFLICT (key) DO NOTHING;
    END IF;
END $$;

-- ============================================
-- Sample Data for Development (Optional)
-- ============================================

-- Only enabled in development mode
-- Comment this out for production

-- DO $$
-- BEGIN
--     Add sample categories
--     IF EXISTS (SELECT 1 FROM information_schema.tables 
--                WHERE table_schema = 'app' AND table_name = 'categories') THEN
--         INSERT INTO app.categories (name, slug, description, icon)
--         VALUES
--             ('NLP Chatbots', 'nlp-chatbots', 'Natural language processing AI agents'),
--             ('Data Analysis', 'data-analysis', 'AI-powered data analysis tools'),
--             ('Computer Vision', 'computer-vision', 'Image and video processing AI'),
--             ('Automation', 'automation', 'Task automation by AI agents'),
--             ('Generative AI', 'generative-ai', 'Content generation AI tools')
--         ON CONFLICT (slug) DO NOTHING;
--     END IF;
-- END $$;

-- ============================================
-- Database Statistics & Monitoring
-- ============================================

-- Create views for monitoring
CREATE OR REPLACE VIEW audit.recent_activities AS
SELECT 
    schemaname,
    tablename,
    n_tup_ins AS inserts,
    n_tup_upd AS updates,
    n_tup_del AS deletes,
    n_live_tup AS live_rows,
    n_dead_tup AS dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY schemaname, tablename;

-- ============================================
-- Final Notes
-- ============================================

-- Database initialized successfully!
-- 
-- Next steps:
-- 1. Run backend migrations: npm run migrations:run
-- 2. Seed database with sample data (optional): npm run seed
-- 3. Start the application

SELECT 'Freelance AI Marketplace database initialized successfully!' AS status;
