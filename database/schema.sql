-- LinkedIn AI Comment Assistant - Supabase Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- =============================================
-- CORE TABLES
-- =============================================

-- 1. Posts Table (Core Entity)
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- LinkedIn Identifiers
  post_id TEXT UNIQUE NOT NULL,
  post_url TEXT NOT NULL,
  
  -- Author Information
  author_name TEXT NOT NULL,
  author_url TEXT,
  author_title TEXT,
  author_company TEXT,
  is_company_post BOOLEAN DEFAULT FALSE,
  
  -- Content Data
  content_markdown TEXT NOT NULL,
  content_raw JSONB NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('text', 'image', 'video', 'document', 'article', 'poll', 'mixed')),
  
  -- Workflow Status
  status TEXT NOT NULL DEFAULT 'captured' 
    CHECK (status IN ('captured', 'researching', 'drafts_ready', 'reviewed', 'published', 'archived')),
  
  -- Processing Metadata
  research_completed_at TIMESTAMPTZ,
  drafts_generated_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  
  -- System Fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- LinkedIn Timestamp
  linkedin_posted_at TIMESTAMPTZ,
  
  -- Processing Flags
  processing_error TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Analytics
  view_count INTEGER DEFAULT 0,
  draft_selection_count INTEGER DEFAULT 0
);

-- 2. Post Research Table (Context Data)
CREATE TABLE post_research (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  
  -- Research Source
  source_type TEXT NOT NULL CHECK (source_type IN ('serp_api', 'news_api', 'manual', 'web_search')),
  search_query TEXT NOT NULL,
  
  -- Research Content
  title TEXT,
  content TEXT NOT NULL,
  url TEXT,
  published_date TIMESTAMPTZ,
  relevance_score DECIMAL(3,2) CHECK (relevance_score >= 0 AND relevance_score <= 1),
  
  -- Metadata
  source_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Content categorization
  content_type TEXT CHECK (content_type IN ('news', 'blog', 'academic', 'social', 'company')),
  is_primary_context BOOLEAN DEFAULT FALSE
);

-- 3. Comment Drafts Table (AI Generated)
CREATE TABLE comment_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  
  -- Draft Content
  draft_text TEXT NOT NULL,
  draft_version INTEGER NOT NULL DEFAULT 1,
  sequence_order INTEGER NOT NULL CHECK (sequence_order >= 1 AND sequence_order <= 10),

  
  -- Draft Categorization
  tone TEXT CHECK (tone IN ('professional', 'casual', 'supportive', 'questioning', 'analytical')),
  style TEXT CHECK (style IN ('short', 'detailed', 'personal_story', 'industry_insight')),
  intent TEXT CHECK (intent IN ('engage', 'share_experience', 'ask_question', 'provide_value')),
  
  -- User Interactions
  is_selected BOOLEAN DEFAULT FALSE,
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  
  -- Processing
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Quality Metrics
  character_count INTEGER GENERATED ALWAYS AS (length(draft_text)) STORED,
  word_count INTEGER,
);

-- 4. Final Outputs Table (Published Comments)
CREATE TABLE final_outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  draft_id UUID REFERENCES comment_drafts(id) ON DELETE SET NULL,
  
  -- Final Comment
  final_comment_text TEXT NOT NULL,
  was_edited BOOLEAN NOT NULL DEFAULT FALSE,
  edit_summary TEXT,
  
  -- Publishing Details
  published_method TEXT NOT NULL CHECK (published_method IN ('manual_copy', 'extension_inject', 'api_post')),
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  linkedin_comment_url TEXT,
  
  -- Performance Tracking
  engagement_metrics JSONB,
  last_metrics_update TIMESTAMPTZ,
  
  -- User Satisfaction
  user_satisfaction_rating INTEGER CHECK (user_satisfaction_rating BETWEEN 1 AND 5),
  would_use_again BOOLEAN,
  feedback_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. User Actions Table (Audit Trail)
CREATE TABLE user_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  draft_id UUID REFERENCES comment_drafts(id) ON DELETE SET NULL,
  
  -- Action Details
  action_type TEXT NOT NULL CHECK (action_type IN ('capture', 'view', 'edit_draft', 'select_draft', 'publish', 'rate', 'research', 'generate_drafts')),
  action_data JSONB,
  
  -- User Context
  user_agent TEXT,
  session_id TEXT,
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT now(),
  processing_time_ms INTEGER
);

-- 6. System Configuration Table
CREATE TABLE system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Configuration
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  config_type TEXT NOT NULL CHECK (config_type IN ('ai_model', 'api_endpoint', 'feature_flag', 'limit')),
  
  -- Metadata
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Posts indexes
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_author ON posts(author_name);
CREATE INDEX idx_posts_processing ON posts(status, created_at) WHERE status IN ('captured', 'researching');
CREATE INDEX idx_posts_linkedin_posted ON posts(linkedin_posted_at DESC);

-- Research indexes
CREATE INDEX idx_research_post_id ON post_research(post_id);
CREATE INDEX idx_research_relevance ON post_research(relevance_score DESC);
CREATE INDEX idx_research_source ON post_research(source_type, created_at DESC);

-- Drafts indexes
CREATE INDEX idx_drafts_post_id ON comment_drafts(post_id);
CREATE INDEX idx_drafts_sequence ON comment_drafts(post_id, sequence_order);
CREATE INDEX idx_drafts_selected ON comment_drafts(is_selected, created_at DESC);
CREATE INDEX idx_drafts_rating ON comment_drafts(user_rating DESC) WHERE user_rating IS NOT NULL;

-- Outputs indexes
CREATE INDEX idx_outputs_post_id ON final_outputs(post_id);
CREATE INDEX idx_outputs_published_at ON final_outputs(published_at DESC);
CREATE INDEX idx_outputs_method ON final_outputs(published_method);

-- Actions indexes
CREATE INDEX idx_actions_post_id ON user_actions(post_id);
CREATE INDEX idx_actions_type ON user_actions(action_type, created_at DESC);
CREATE INDEX idx_actions_session ON user_actions(session_id, created_at DESC);

-- =============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================

-- Update posts.updated_at on any change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_posts_updated_at 
  BEFORE UPDATE ON posts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at 
  BEFORE UPDATE ON system_config 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Update word count when draft text changes
CREATE OR REPLACE FUNCTION update_word_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.word_count = array_length(string_to_array(trim(NEW.draft_text), ' '), 1);
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_comment_drafts_word_count 
  BEFORE INSERT OR UPDATE OF draft_text ON comment_drafts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_word_count();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (you can restrict this later with proper auth)
CREATE POLICY "Allow all operations" ON posts FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON post_research FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON comment_drafts FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON final_outputs FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON user_actions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON system_config FOR ALL USING (true);

-- =============================================
-- DEFAULT CONFIGURATION DATA
-- =============================================

INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
('ai_model_primary', '"gpt-4"', 'ai_model', 'Primary AI model for draft generation'),
('ai_model_secondary', '"gpt-3.5-turbo"', 'ai_model', 'Fallback AI model for draft generation'),
('drafts_per_post', '6', 'limit', 'Number of drafts to generate per post'),
('research_sources_max', '5', 'limit', 'Maximum research sources per post'),
('auto_archive_days', '30', 'limit', 'Days before auto-archiving old posts'),
('max_retry_attempts', '3', 'limit', 'Maximum retry attempts for failed processing'),
('research_enabled', 'true', 'feature_flag', 'Enable research phase for posts'),
('realtime_notifications', 'true', 'feature_flag', 'Enable real-time notifications'),
('ai_temperature', '0.7', 'ai_model', 'Temperature setting for AI generation'),
('max_tokens_per_draft', '300', 'ai_model', 'Maximum tokens per comment draft');

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to get posts ready for review
CREATE OR REPLACE FUNCTION get_posts_ready_for_review()
RETURNS TABLE (
  post_id UUID,
  author_name TEXT,
  content_preview TEXT,
  draft_count BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.author_name,
    LEFT(p.content_markdown, 100) || '...' as content_preview,
    COUNT(cd.id) as draft_count,
    p.created_at
  FROM posts p
  LEFT JOIN comment_drafts cd ON p.id = cd.post_id
  WHERE p.status = 'drafts_ready'
  GROUP BY p.id, p.author_name, p.content_markdown, p.created_at
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to update post status with logging
CREATE OR REPLACE FUNCTION update_post_status(
  p_post_id UUID,
  p_new_status TEXT,
  p_session_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  old_status TEXT;
BEGIN
  -- Get current status
  SELECT status INTO old_status FROM posts WHERE id = p_post_id;
  
  -- Update status
  UPDATE posts 
  SET status = p_new_status,
      updated_at = now()
  WHERE id = p_post_id;
  
  -- Log the action
  INSERT INTO user_actions (post_id, action_type, action_data, session_id)
  VALUES (
    p_post_id,
    'status_change',
    jsonb_build_object('old_status', old_status, 'new_status', p_new_status),
    p_session_id
  );
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for dashboard post list
CREATE VIEW dashboard_posts AS
SELECT 
  p.id,
  p.post_id,
  p.author_name,
  p.author_company,
  p.media_type,
  p.status,
  p.created_at,
  p.linkedin_posted_at,
  LEFT(p.content_markdown, 200) || '...' as content_preview,
  COUNT(cd.id) as draft_count,
  COUNT(CASE WHEN cd.is_selected THEN 1 END) as selected_draft_count,
  MAX(cd.created_at) as latest_draft_at
FROM posts p
LEFT JOIN comment_drafts cd ON p.id = cd.post_id
GROUP BY p.id, p.post_id, p.author_name, p.author_company, p.media_type, p.status, p.created_at, p.linkedin_posted_at, p.content_markdown
ORDER BY p.created_at DESC;

-- View for post analytics
CREATE VIEW post_analytics AS
SELECT 
  p.id,
  p.post_id,
  p.author_name,
  p.status,
  p.created_at,
  COUNT(DISTINCT cd.id) as total_drafts,
  COUNT(DISTINCT CASE WHEN cd.user_rating IS NOT NULL THEN cd.id END) as rated_drafts,
  AVG(cd.user_rating) as avg_draft_rating,
  COUNT(DISTINCT fo.id) as published_comments,
  COUNT(DISTINCT ua.id) as total_actions,
  MAX(ua.created_at) as last_action_at
FROM posts p
LEFT JOIN comment_drafts cd ON p.id = cd.post_id
LEFT JOIN final_outputs fo ON p.id = fo.post_id
LEFT JOIN user_actions ua ON p.id = ua.post_id
GROUP BY p.id, p.post_id, p.author_name, p.status, p.created_at;

-- =============================================
-- REALTIME SUBSCRIPTIONS
-- =============================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE comment_drafts;
ALTER PUBLICATION supabase_realtime ADD TABLE final_outputs;
ALTER PUBLICATION supabase_realtime ADD TABLE user_actions;