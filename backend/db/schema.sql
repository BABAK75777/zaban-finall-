-- Multi-user TTS System Database Schema
-- PostgreSQL 12+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL, -- bcrypt hash
  plan VARCHAR(50) NOT NULL DEFAULT 'free', -- free, pro
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, suspended
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- TTS Sessions table
CREATE TABLE IF NOT EXISTS tts_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_key VARCHAR(255) NOT NULL, -- hash of session identifier
  total_chunks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, completed, canceled, error
  UNIQUE(user_id, session_key)
);

-- TTS Chunks table
CREATE TABLE IF NOT EXISTS tts_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES tts_sessions(id) ON DELETE CASCADE,
  chunk_hash VARCHAR(64) NOT NULL, -- SHA-256 hash
  format VARCHAR(10) NOT NULL, -- mp3, wav, ogg
  bytes INTEGER NOT NULL DEFAULT 0,
  cache_hit BOOLEAN NOT NULL DEFAULT false,
  gemini_latency_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  INDEX idx_user_chunk_hash (user_id, chunk_hash),
  INDEX idx_session_id (session_id)
);

-- Daily usage tracking
CREATE TABLE IF NOT EXISTS usage_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  chars_generated INTEGER NOT NULL DEFAULT 0,
  chunks_generated INTEGER NOT NULL DEFAULT 0,
  seconds_audio_est INTEGER NOT NULL DEFAULT 0, -- estimated seconds
  requests INTEGER NOT NULL DEFAULT 0,
  cache_hit_rate DECIMAL(5,2) NOT NULL DEFAULT 0.0, -- percentage
  gemini_failures INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Audit logs for security events
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL, -- login, logout, quota_exceeded, unusual_traffic, admin_action, etc.
  details JSONB,
  ip_address VARCHAR(45), -- IPv6 compatible
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  INDEX idx_user_event (user_id, event_type),
  INDEX idx_created_at (created_at)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_tts_sessions_user ON tts_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tts_sessions_status ON tts_sessions(status);
CREATE INDEX IF NOT EXISTS idx_tts_chunks_user ON tts_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_daily_user_date ON usage_daily(user_id, date);

