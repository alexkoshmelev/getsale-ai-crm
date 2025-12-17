# Technical Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  Next.js + React + Tailwind + Zustand + React Query         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ REST API / WebSocket
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                     API Gateway Layer                       │
│  NestJS + Rate Limiting + Auth Middleware                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────┴──────┐ ┌─────┴──────┐ ┌────┴──────┐
│   Core API   │ │  AI Engine  │ │  Events   │
│   Service    │ │   Service   │ │   Bus     │
└───────┬──────┘ └─────┬──────┘ └────┬──────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────┴──────┐ ┌─────┴──────┐ ┌────┴──────┐
│  PostgreSQL  │ │   Redis    │ │ Vector DB │
│   (Primary)  │ │  (Cache)   │ │  (AI Mem) │
└──────────────┘ └────────────┘ └───────────┘
```

## Core Services

### 1. API Service (NestJS)

**Responsibilities:**
- REST API endpoints
- Authentication & Authorization
- Request validation
- Multi-tenant data isolation
- Audit logging

**Key Modules:**
```
src/
├── auth/           # Authentication & JWT
├── organizations/  # Multi-tenant orgs
├── users/          # User management
├── contacts/       # CRM contacts
├── companies/      # Company records
├── pipelines/      # Sales pipelines
├── deals/          # Deals/opportunities
├── chats/          # Chat management
├── messages/       # Message handling
├── campaigns/      # Outreach campaigns
├── agents/         # AI agent configs
├── analytics/      # Metrics & reports
├── billing/        # Subscriptions & usage
├── integrations/   # Third-party integrations
├── webhooks/       # Webhook management
└── common/         # Shared utilities
```

### 2. AI Engine Service

**Responsibilities:**
- LLM integration (OpenAI/Anthropic)
- Agent orchestration
- Memory management
- Tool execution
- Guardrails enforcement

**Components:**
- **Agent Manager**: Creates and manages agent instances
- **Memory System**: Short-term (Redis) + Long-term (Vector DB)
- **Tool Registry**: Available tools for agents
- **Guardrail Engine**: Safety checks and compliance
- **Prompt Manager**: Template management

### 3. Event Bus

**Responsibilities:**
- Event publishing/subscribing
- Event sourcing
- Trigger system
- Webhook delivery

**Event Types:**
- `contact.created`
- `contact.updated`
- `deal.stage.changed`
- `message.received`
- `message.sent`
- `campaign.started`
- `campaign.completed`
- `ai.agent.triggered`
- `billing.subscription.updated`

## Database Schema (Detailed)

### Organizations & Users

```sql
-- Organizations (workspaces)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  billing_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  avatar_url TEXT,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Organization Members (many-to-many with roles)
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- owner, admin, bidi, viewer
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- OAuth Connections
CREATE TABLE oauth_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- google, telegram
  provider_user_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider, provider_user_id)
);
```

### CRM Core

```sql
-- Companies
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  description TEXT,
  size VARCHAR(50), -- startup, small, medium, large, enterprise
  stage VARCHAR(50), -- lead, prospect, customer, partner
  website VARCHAR(255),
  logo_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contacts
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  role VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  telegram_username VARCHAR(100),
  telegram_chat_id BIGINT,
  linkedin_url TEXT,
  whatsapp_phone VARCHAR(50),
  tags TEXT[],
  notes TEXT,
  source VARCHAR(100), -- manual, import, integration
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pipelines
CREATE TABLE pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pipeline Stages
CREATE TABLE pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  order_index INTEGER NOT NULL,
  color VARCHAR(7),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(pipeline_id, order_index)
);

-- Deals
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  value DECIMAL(12, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  expected_close_date DATE,
  probability INTEGER DEFAULT 0, -- 0-100
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Chats & Messages

```sql
-- Chats
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL, -- telegram, email, linkedin, whatsapp
  channel_thread_id VARCHAR(255), -- external thread ID
  title VARCHAR(255),
  is_unread BOOLEAN DEFAULT TRUE,
  last_message_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, contact_id, channel, channel_thread_id)
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  sender_type VARCHAR(50) NOT NULL, -- user, contact, ai_agent
  sender_id UUID, -- user_id, contact_id, or agent_id
  content TEXT NOT NULL,
  is_incoming BOOLEAN NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  ai_draft BOOLEAN DEFAULT FALSE,
  ai_agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Message Attachments
CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_type VARCHAR(100),
  file_size INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### AI Agents

```sql
-- AI Agents
CREATE TABLE ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- bizdev, sdr, followup, analytics, admin
  description TEXT,
  prompt_template TEXT NOT NULL,
  model VARCHAR(100) DEFAULT 'gpt-4',
  temperature DECIMAL(3, 2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,
  tools TEXT[], -- available tools
  guardrails JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Agent Memory (Long-term)
CREATE TABLE agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  memory_type VARCHAR(50), -- fact, preference, context
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- for similarity search
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agent Executions (Log)
CREATE TABLE agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  trigger_event VARCHAR(100),
  input_data JSONB,
  output_data JSONB,
  status VARCHAR(50), -- success, error, blocked
  error_message TEXT,
  tokens_used INTEGER,
  execution_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Campaigns

```sql
-- Campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, paused, completed
  target_audience JSONB, -- filters for contacts
  message_template TEXT NOT NULL,
  trigger_type VARCHAR(50), -- manual, scheduled, event
  trigger_config JSONB,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Campaign Messages
CREATE TABLE campaign_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  status VARCHAR(50), -- pending, sent, delivered, replied, failed
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  replied_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Billing

```sql
-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL, -- free, pro, team, enterprise
  status VARCHAR(50) DEFAULT 'active', -- active, canceled, past_due
  billing_cycle VARCHAR(50) DEFAULT 'monthly', -- monthly, yearly
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Usage Logs
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metric_type VARCHAR(50) NOT NULL, -- messages_sent, ai_calls, storage_gb
  quantity INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed
  stripe_invoice_id VARCHAR(255),
  paid_at TIMESTAMP,
  due_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Integrations & Webhooks

```sql
-- Integrations
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- hubspot, salesforce, telegram, email
  name VARCHAR(255),
  config JSONB NOT NULL, -- encrypted credentials
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Webhooks
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Webhook Deliveries
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50), -- pending, success, failed
  response_status INTEGER,
  response_body TEXT,
  attempts INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Events & Audit

```sql
-- Events (Event Sourcing)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100), -- contact, deal, message, etc.
  entity_id UUID,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_contacts_org_id ON contacts(organization_id);
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_deals_org_id ON deals(organization_id);
CREATE INDEX idx_deals_stage_id ON deals(stage_id);
CREATE INDEX idx_chats_org_id ON chats(organization_id);
CREATE INDEX idx_chats_contact_id ON chats(contact_id);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_events_org_id ON events(organization_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_agent_memories_contact_id ON agent_memories(contact_id);
CREATE INDEX idx_agent_memories_embedding ON agent_memories USING ivfflat (embedding vector_cosine_ops);
```

## Redis Structure

### Cache Keys
```
org:{orgId}:settings
user:{userId}:sessions
chat:{chatId}:unread_count
pipeline:{pipelineId}:stats
```

### Real-time Channels
```
org:{orgId}:events
chat:{chatId}:messages
user:{userId}:notifications
```

### Rate Limiting
```
rate_limit:api:{userId}:{endpoint}
rate_limit:ai:{orgId}:{agentId}
```

## Vector Database (pgvector)

- **Embeddings**: 1536 dimensions (OpenAI ada-002)
- **Index Type**: IVFFlat for fast similarity search
- **Use Cases**:
  - Agent long-term memory
  - Contact similarity search
  - Message context retrieval

## API Design Patterns

### Multi-tenancy
- All queries filtered by `organization_id`
- Row-level security (RLS) in PostgreSQL
- Middleware enforces tenant context

### Pagination
```typescript
{
  page: number;
  limit: number;
  total: number;
  data: T[];
}
```

### Error Handling
```typescript
{
  error: {
    code: string;
    message: string;
    details?: any;
  }
}
```

### Webhooks
- HMAC signature verification
- Retry with exponential backoff
- Idempotency keys

## Security

### Authentication
- JWT tokens (access + refresh)
- OAuth 2.0 (Google, Telegram)
- MFA support (TOTP)

### Authorization
- RBAC with organization context
- Resource-level permissions
- API key for integrations

### Data Protection
- Encryption at rest (database)
- TLS in transit
- PII encryption for sensitive fields
- GDPR compliance (data export/deletion)

## Deployment Architecture

### Development
- Docker Compose (all services)
- Local PostgreSQL + Redis
- Mock AI service

### Staging
- Kubernetes cluster
- Separate namespaces
- CI/CD pipeline

### Production
- Kubernetes (multi-region)
- Database replication
- Redis cluster
- CDN for static assets
- Load balancers
- Auto-scaling

## Monitoring Stack

- **APM**: New Relic / Datadog
- **Logs**: ELK Stack / CloudWatch
- **Metrics**: Prometheus + Grafana
- **Alerts**: PagerDuty / Opsgenie
- **Error Tracking**: Sentry

