-- Freelance AI Agents Marketplace Database Schema

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table (both clients and agents)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  user_type VARCHAR(20) CHECK (user_type IN ('client', 'agent', 'admin')) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agent Profiles
CREATE TABLE agent_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  skills TEXT[] NOT NULL,
  portfolio_url TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  website_url TEXT,
  hourly_rate DECIMAL(10, 2), -- Per hour rate in USD
  availability_status VARCHAR(20) CHECK (availability_status IN ('available', 'busy', 'offline')) DEFAULT 'available',
  experience_years INTEGER DEFAULT 0,
  education TEXT,
  certifications TEXT[],
  total_earnings DECIMAL(12, 2) DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Tasks/Projects
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  skills_required TEXT[] NOT NULL,
  budget_min DECIMAL(10, 2),
  budget_max DECIMAL(10, 2),
  budget_type VARCHAR(20) CHECK (budget_type IN ('fixed', 'hourly')) NOT NULL,
  estimated_hours INTEGER,
  deadline TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled', 'disputed')) DEFAULT 'open',
  complexity VARCHAR(20) CHECK (complexity IN ('low', 'medium', 'high')) DEFAULT 'medium',
  attachments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agent Ratings (Client to Agent)
CREATE TABLE agent_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  review TEXT NOT NULL,
  communication_rating INTEGER CHECK (communication_rating >= 1 AND rating <= 5),
  quality_rating INTEGER CHECK (quality_rating >= 1 AND rating <= 5),
  timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id)
);

-- Client Ratings (Agent to Client)
CREATE TABLE client_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  review TEXT NOT NULL,
  payment_promptness INTEGER CHECK (payment_promptness >= 1 AND rating <= 5),
  clarity_rating INTEGER CHECK (clarity_rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id)
);

-- Task Proposals/Bids
CREATE TABLE task_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  proposed_amount DECIMAL(10, 2) NOT NULL,
  proposed_duration_days INTEGER,
  cover_letter TEXT NOT NULL,
  status VARCHAR(20) CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, agent_id)
);

-- Task Assignments (when a proposal is accepted)
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES task_proposals(id) ON DELETE CASCADE,
  agreed_amount DECIMAL(10, 2) NOT NULL,
  agreed_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) CHECK (status IN ('active', 'completed', 'cancelled', 'disputed')) DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id)
);

-- Payments/Escrow
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  client_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  fee_amount DECIMAL(10, 2) NOT NULL, -- Platform fee
  stripe_payment_intent_id VARCHAR(255),
  status VARCHAR(20) CHECK (status IN ('pending', 'escrow', 'released', 'refunded', 'failed')) DEFAULT 'pending',
  payment_type VARCHAR(20) CHECK (payment_type IN ('deposit', 'release', 'refund', 'platform_fee')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transactions (for accounting)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_type VARCHAR(20) CHECK (transaction_type IN ('credit', 'debit')) NOT NULL,
  description TEXT NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Messages (task communication)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  attachment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Activity Logs
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type ON users(user_type);
CREATE INDEX idx_agent_profiles_user_id ON agent_profiles(user_id);
CREATE INDEX idx_agent_profiles_skills ON agent_profiles USING GIN(skills);
CREATE INDEX idx_tasks_client_id ON tasks(client_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_skills ON tasks USING GIN(skills_required);
CREATE INDEX idx_task_proposals_task_id ON task_proposals(task_id);
CREATE INDEX idx_task_proposals_agent_id ON task_proposals(agent_id);
CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_agent_id ON task_assignments(agent_id);
CREATE INDEX idx_payments_task_id ON payments(task_id);
CREATE INDEX idx_payments_client_id ON payments(client_id);
CREATE INDEX idx_payments_agent_id ON payments(agent_id);
CREATE INDEX idx_messages_task_id ON messages(task_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Updated At Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_profiles_updated_at BEFORE UPDATE ON agent_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_proposals_updated_at BEFORE UPDATE ON task_proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Agent Ratings Aggregation View
CREATE VIEW agent_stats AS
SELECT 
    a.id,
    a.email,
    ap.title,
    ap.hourly_rate,
    ap.skills,
    ap.completed_tasks,
    COALESCE(AVG(ar.rating), 0) as average_rating,
    COUNT(DISTINCT ar.id) as total_reviews,
    a.created_at as member_since
FROM users a
LEFT JOIN agent_profiles ap ON a.id = ap.user_id
LEFT JOIN agent_ratings ar ON a.id = ar.agent_id
WHERE a.user_type = 'agent'
GROUP BY a.id, ap.title, ap.hourly_rate, ap.skills, ap.completed_tasks, a.email, a.created_at;

-- Client Ratings Aggregation View
CREATE VIEW client_stats AS
SELECT 
    c.id,
    c.email,
    COUNT(DISTINCT t.id) as total_tasks_posted,
    COALESCE(AVG(cr.rating), 0) as average_rating,
    COUNT(DISTINCT cr.id) as total_reviews,
    COALESCE(SUM(CASE WHEN p.amount IS NOT NULL THEN p.amount ELSE 0 END), 0) as total_spent
FROM users c
LEFT JOIN tasks t ON c.id = t.client_id
LEFT JOIN client_ratings cr ON c.id = cr.client_id
LEFT JOIN payments p ON c.id = p.client_id AND p.status = 'released'
WHERE c.user_type = 'client'
GROUP BY c.id, c.email;
