import { pool } from './db.js';

export async function runMigrations() {
  console.log('[Migration] Checking and initializing database schema tables...');
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'author',
        avatar_url TEXT,
        bio TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        user_agent TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        parent_id UUID,
        publishing_policy VARCHAR(50) NOT NULL DEFAULT 'manual',
        default_provider_id UUID,
        default_model_id VARCHAR(100),
        ai_settings JSONB DEFAULT '{}'::jsonb,
        featured_image TEXT,
        seo_title VARCHAR(255),
        seo_description TEXT,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tags (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(50) NOT NULL UNIQUE,
        slug VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS articles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        excerpt TEXT NOT NULL,
        content_html TEXT NOT NULL,
        content_markdown TEXT,
        category_id UUID NOT NULL REFERENCES categories(id),
        author_id UUID NOT NULL REFERENCES users(id),
        featured_image TEXT,
        featured_image_alt VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        reading_time_mins INTEGER NOT NULL DEFAULT 3,
        views_count INTEGER NOT NULL DEFAULT 0,
        is_featured_lead BOOLEAN NOT NULL DEFAULT FALSE,
        is_trending BOOLEAN NOT NULL DEFAULT FALSE,
        meta_title VARCHAR(255),
        meta_description TEXT,
        canonical_url TEXT,
        og_image TEXT,
        schema_json JSONB,
        tags JSONB DEFAULT '[]'::jsonb,
        ai_metadata JSONB DEFAULT '{}'::jsonb,
        published_at TIMESTAMP,
        scheduled_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
      CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
      CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
      CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id);

      CREATE TABLE IF NOT EXISTS article_revisions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content_html TEXT NOT NULL,
        excerpt TEXT,
        revision_number INTEGER NOT NULL,
        change_summary VARCHAR(255),
        user_id UUID REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS article_sources (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        source_name VARCHAR(150) NOT NULL,
        url TEXT NOT NULL,
        published_at TIMESTAMP,
        claim_extracted TEXT,
        credibility_score INTEGER DEFAULT 85,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS research_sources (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(150) NOT NULL,
        feed_url TEXT NOT NULL UNIQUE,
        site_url TEXT,
        category_id UUID REFERENCES categories(id),
        priority INTEGER NOT NULL DEFAULT 1,
        polling_interval_mins INTEGER NOT NULL DEFAULT 30,
        is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        last_fetched_at TIMESTAMP,
        last_status VARCHAR(50) DEFAULT 'pending',
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS discovered_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        source_id UUID NOT NULL REFERENCES research_sources(id) ON DELETE CASCADE,
        headline TEXT NOT NULL,
        canonical_url TEXT NOT NULL,
        summary TEXT,
        content TEXT,
        published_date TIMESTAMP,
        retrieved_at TIMESTAMP NOT NULL DEFAULT NOW(),
        category_id UUID REFERENCES categories(id),
        duplicate_key VARCHAR(255) NOT NULL UNIQUE,
        status VARCHAR(50) NOT NULL DEFAULT 'new',
        relevance_score INTEGER DEFAULT 70,
        entities JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ai_providers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(50) NOT NULL UNIQUE,
        api_key_encrypted TEXT,
        base_url TEXT,
        is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        is_free_tier_available BOOLEAN NOT NULL DEFAULT FALSE,
        rate_limits_info TEXT,
        pricing_doc_url TEXT,
        settings_json JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ai_models (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
        model_id VARCHAR(100) NOT NULL,
        display_name VARCHAR(150) NOT NULL,
        capabilities JSONB NOT NULL DEFAULT '["text", "structured_output"]'::jsonb,
        context_window INTEGER,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        pricing_notes TEXT,
        discovered_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS image_providers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(50) NOT NULL UNIQUE,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        model_id VARCHAR(100),
        settings_json JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS generated_images (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
        prompt TEXT NOT NULL,
        image_url TEXT NOT NULL,
        alt_text VARCHAR(255) NOT NULL,
        provider_slug VARCHAR(50) NOT NULL,
        model_id VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'completed',
        metadata_json JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Ensure existing databases update foreign key constraint to ON DELETE CASCADE
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'generated_images_article_id_fkey'
          AND table_name = 'generated_images'
        ) THEN
          ALTER TABLE generated_images DROP CONSTRAINT generated_images_article_id_fkey;
        END IF;

        ALTER TABLE generated_images ADD CONSTRAINT generated_images_article_id_fkey
          FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE;
      EXCEPTION
        WHEN OTHERS THEN
          NULL;
      END $$;

      CREATE TABLE IF NOT EXISTS image_automation_jobs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        prompt TEXT NOT NULL,
        article_title VARCHAR(255) NOT NULL,
        category_name VARCHAR(100),
        aspect_ratio VARCHAR(20) NOT NULL DEFAULT '16:9',
        visual_style TEXT,
        auto_publish_on_complete BOOLEAN NOT NULL DEFAULT TRUE,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        claimed_by VARCHAR(150),
        claimed_at TIMESTAMP,
        completed_at TIMESTAMP,
        uploaded_image_url TEXT,
        error_message TEXT,
        logs_json JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_image_automation_jobs_status ON image_automation_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_image_automation_jobs_article_id ON image_automation_jobs(article_id);
      ALTER TABLE image_automation_jobs ALTER COLUMN article_id DROP NOT NULL;

      CREATE TABLE IF NOT EXISTS article_view_records (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        ip_hash VARCHAR(64) NOT NULL,
        session_hash VARCHAR(64),
        dwell_time_seconds INTEGER NOT NULL DEFAULT 0,
        user_agent TEXT,
        is_verified BOOLEAN NOT NULL DEFAULT TRUE,
        viewed_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_article_view_records_lookup ON article_view_records(article_id, ip_hash, viewed_at);

      CREATE TABLE IF NOT EXISTS workflows (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(150) NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        trigger_type VARCHAR(50) NOT NULL DEFAULT 'schedule',
        cron_expression VARCHAR(50) DEFAULT '0 */2 * * *',
        nodes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        edges_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        settings_json JSONB DEFAULT '{}'::jsonb,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS workflow_executions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        trigger_source VARCHAR(50) DEFAULT 'manual',
        step_logs JSONB DEFAULT '[]'::jsonb,
        tokens_used INTEGER DEFAULT 0,
        cost_usd VARCHAR(20) DEFAULT '0.0000',
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS prompt_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        task_type VARCHAR(50) NOT NULL,
        system_prompt TEXT NOT NULL,
        user_prompt_template TEXT NOT NULL,
        parameters_schema JSONB DEFAULT '{}'::jsonb,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS media_assets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size_bytes INTEGER NOT NULL,
        storage_path TEXT NOT NULL,
        public_url TEXT NOT NULL,
        alt_text VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS internal_link_suggestions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        source_article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        target_article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        anchor_text VARCHAR(150) NOT NULL,
        relevance_score INTEGER NOT NULL DEFAULT 80,
        status VARCHAR(50) NOT NULL DEFAULT 'suggested',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) NOT NULL UNIQUE,
        status VARCHAR(50) NOT NULL DEFAULT 'subscribed',
        consent_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        unsubscribe_token VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_type VARCHAR(50) NOT NULL,
        article_id UUID,
        path TEXT NOT NULL,
        referrer TEXT,
        user_agent_hash VARCHAR(64),
        ip_hash VARCHAR(64),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS daily_analytics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        date VARCHAR(10) NOT NULL UNIQUE,
        pageviews INTEGER NOT NULL DEFAULT 0,
        unique_visitors INTEGER NOT NULL DEFAULT 0,
        article_views_json JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS usage_records (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        provider_slug VARCHAR(50) NOT NULL,
        model_id VARCHAR(100) NOT NULL,
        task_type VARCHAR(50) NOT NULL,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        estimated_cost_usd VARCHAR(20) NOT NULL DEFAULT '0.000000',
        duration_ms INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS application_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        key VARCHAR(100) NOT NULL UNIQUE,
        value_json JSONB NOT NULL,
        description TEXT,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS appearance_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        accent_color VARCHAR(50) NOT NULL DEFAULT '#4F46E5',
        sidebar_color VARCHAR(50) NOT NULL DEFAULT '#0F172A',
        surface_color VARCHAR(50) NOT NULL DEFAULT '#FFFFFF',
        border_style VARCHAR(50) NOT NULL DEFAULT 'subtle',
        theme_mode VARCHAR(20) NOT NULL DEFAULT 'system',
        density VARCHAR(20) NOT NULL DEFAULT 'comfortable',
        sidebar_collapsed BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        user_email VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(100),
        details_json JSONB DEFAULT '{}'::jsonb,
        ip_address VARCHAR(45),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS training_blogs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        url TEXT NOT NULL,
        title VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        word_count INTEGER NOT NULL DEFAULT 0,
        summary TEXT,
        extracted_style JSONB DEFAULT '{}'::jsonb,
        raw_content TEXT,
        error_message TEXT,
        fetched_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS training_topics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        text TEXT NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'topic',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- 15. Managed Sites & Performance Audits
      CREATE TABLE IF NOT EXISTS managed_sites (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(150) NOT NULL,
        url TEXT NOT NULL,
        gsc_property_url TEXT,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS lighthouse_audits (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        site_id UUID REFERENCES managed_sites(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        strategy VARCHAR(20) NOT NULL DEFAULT 'mobile',
        performance_score INTEGER NOT NULL DEFAULT 0,
        accessibility_score INTEGER NOT NULL DEFAULT 0,
        best_practices_score INTEGER NOT NULL DEFAULT 0,
        seo_score INTEGER NOT NULL DEFAULT 0,
        core_web_vitals JSONB DEFAULT '{}'::jsonb,
        opportunities JSONB DEFAULT '[]'::jsonb,
        diagnostics JSONB DEFAULT '[]'::jsonb,
        audited_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS google_search_console_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255),
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expiry TIMESTAMP,
        scopes TEXT,
        is_connected BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS search_console_cache (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        site_url TEXT NOT NULL,
        date_range VARCHAR(50) NOT NULL,
        data_json JSONB NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- 16. Google Analytics 4 (GA4) Tables & Columns
      ALTER TABLE managed_sites ADD COLUMN IF NOT EXISTS ga4_property_id TEXT;
      ALTER TABLE managed_sites ADD COLUMN IF NOT EXISTS ga4_measurement_id TEXT;

      CREATE TABLE IF NOT EXISTS google_analytics_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255),
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expiry TIMESTAMP,
        scopes TEXT,
        selected_property_id VARCHAR(100),
        selected_property_name VARCHAR(255),
        is_connected BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ga4_analytics_cache (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        property_id TEXT NOT NULL,
        date_range VARCHAR(50) NOT NULL,
        data_json JSONB NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Seed primary default site if empty or update measurement ID
      INSERT INTO managed_sites (name, url, gsc_property_url, ga4_measurement_id, is_default, notes)
      SELECT 'Daily Build Blogs', 'https://blogs.dailybuild.tech', 'sc-domain:blogs.dailybuild.tech', 'G-4NWNVQ4KGG', TRUE, 'Primary production publication property'
      WHERE NOT EXISTS (SELECT 1 FROM managed_sites);

      UPDATE managed_sites
      SET ga4_measurement_id = 'G-4NWNVQ4KGG'
      WHERE url = 'https://blogs.dailybuild.tech' AND (ga4_measurement_id IS NULL OR ga4_measurement_id = '');


      -- Ensure OpenRouter is available in ai_providers
      INSERT INTO ai_providers (name, slug, base_url, is_enabled, is_free_tier_available, rate_limits_info, pricing_doc_url)
      VALUES ('OpenRouter.ai', 'openrouter', 'https://openrouter.ai/api/v1', FALSE, TRUE, 'Universal model aggregator with access to 300+ models from OpenAI, Anthropic, Google, Meta, and open-source labs.', 'https://openrouter.ai/docs')
      ON CONFLICT (slug) DO NOTHING;

      -- Remove standalone grok, claude, and custom_openai providers
      DELETE FROM ai_providers WHERE slug IN ('grok', 'claude', 'custom_openai');
    `);
    console.log('[Migration] Database tables verified and ready.');
  } catch (err: any) {
    console.error('[Migration Error]:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
