# GetSale AI CRM - Development Documentation

AI-first CRM SaaS for B2B / cold outreach / BizDev teams.

**Positioning**: "CRM + BizDev OS + AI Cold Outreach Engine"

## 📚 Documentation

This repository contains the complete development plan and architecture documentation:

1. **[MASTER_PLAN.md](./MASTER_PLAN.md)** - Complete product vision, features, and requirements
2. **[TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md)** - Detailed technical architecture, database schema, and system design
3. **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Project structure, tech stack, and setup guide
4. **[MVP_ROADMAP.md](./MVP_ROADMAP.md)** - 20-week implementation roadmap with detailed tasks

## 🎯 Product Overview

### Core Features

- **CRM**: Contacts, companies, sales pipelines
- **Messaging**: Telegram-first, email, LinkedIn, WhatsApp
- **AI Agents**: BizDev, SDR, follow-up assistants
- **Outreach**: Mass and triggered campaigns
- **Analytics**: Metrics, conversion tracking, AI performance

### Key Differentiators

- **AI-First**: AI is core workflow, not a feature
- **Messaging-Centric**: Telegram-style UI, CRM data in chat
- **Event-Driven**: All actions trigger AI agents
- **Multi-Tenant**: Built for SaaS from day 1

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- Next.js 14+ (App Router)
- React 18+
- Tailwind CSS
- Zustand + React Query

**Backend:**
- NestJS
- PostgreSQL + pgvector
- Redis
- BullMQ

**AI:**
- OpenAI API
- LangChain.js
- Vector DB (pgvector)

**Infrastructure:**
- Docker
- Kubernetes
- GitHub Actions

### System Architecture

```
Frontend (Next.js) → API Gateway (NestJS) → Core Services
                                              ├── CRM Service
                                              ├── AI Engine
                                              └── Event Bus
                                              ↓
                                    PostgreSQL + Redis + Vector DB
```

## 🚀 Quick Start

**👉 See [QUICKSTART.md](./QUICKSTART.md) for a 5-minute setup guide!**

### Prerequisites

- Node.js 18+
- pnpm (or yarn/npm)
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### Setup

```bash
# Clone repository
git clone <repo-url>
cd getsale-ai-crm

# Install dependencies
pnpm install

# Start Docker services
docker-compose up -d

# Setup database
cd apps/api
cp .env.example .env
# Edit .env with your configuration
pnpm prisma:generate
pnpm migrate:dev

# Start development (from root)
pnpm dev
```

See [SETUP.md](./SETUP.md) for detailed setup instructions.

## 📋 MVP Roadmap

### Phase 1: Foundation (Weeks 1-4)
- Authentication & Organizations
- CRM Core (Contacts, Companies)
- Pipelines & Deals

### Phase 2: Messaging (Weeks 5-8)
- Telegram Integration
- Chat UI
- Email Integration

### Phase 3: AI Features (Weeks 9-12)
- AI Infrastructure
- AI Reply Drafts
- AI Agent System

### Phase 4: Outreach (Weeks 13-16)
- Campaign System
- Trigger System
- Mass Outreach

### Phase 5: Billing & Polish (Weeks 17-20)
- Billing System
- Analytics
- Notifications
- Testing & Polish

See [MVP_ROADMAP.md](./MVP_ROADMAP.md) for detailed task breakdown.

## 🗄️ Database Schema

### Core Tables

- `organizations` - Workspaces
- `users` - User accounts
- `organization_members` - User-org relationships
- `contacts` - CRM contacts
- `companies` - Company records
- `pipelines` - Sales pipelines
- `stages` - Pipeline stages
- `deals` - Deals/opportunities
- `chats` - Chat conversations
- `messages` - Chat messages
- `ai_agents` - AI agent configurations
- `campaigns` - Outreach campaigns
- `events` - Event log
- `subscriptions` - Billing subscriptions

See [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md) for complete schema.

## 🔐 Security

- Multi-tenant data isolation
- RBAC (Role-Based Access Control)
- JWT authentication
- OAuth 2.0 (Google, Telegram)
- MFA support
- Encryption at rest and in transit
- Audit logging
- Rate limiting

## 📊 Key Metrics

### Product Metrics
- Monthly Active Users (MAU)
- Retention rate (30/60/90 days)
- Feature adoption

### Business Metrics
- MRR (Monthly Recurring Revenue)
- Churn rate
- Customer LTV

### AI Metrics
- AI reply acceptance rate
- Agent task success rate
- Human override rate

## 🔗 Integrations

### Planned Integrations

**CRM:**
- HubSpot
- Salesforce
- Pipedrive

**Messaging:**
- Telegram (MVP)
- Email (SMTP)
- LinkedIn
- WhatsApp

**Data:**
- Zapier / Make
- Webhooks

## 📝 Development Guidelines

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Pre-commit hooks

### Testing
- Unit tests (Jest/Vitest)
- Integration tests
- E2E tests
- 70%+ coverage target

### Git Workflow
- `main` - Production
- `develop` - Staging
- `feature/*` - Features
- `fix/*` - Bug fixes

### Commit Convention
```
feat: add AI agent configuration
fix: resolve chat message ordering
docs: update API documentation
```

## 🎯 Success Criteria

### MVP Requirements
- ✅ User authentication & organizations
- ✅ CRM (contacts, companies, pipelines)
- ✅ Telegram messaging
- ✅ AI reply drafts
- ✅ Campaign system
- ✅ Billing & subscriptions

### Performance Targets
- API response: < 200ms (p95)
- Chat delivery: < 100ms
- AI drafts: < 5s
- Uptime: 99.9%

## 📞 Support & Contact

For questions or contributions, please refer to the documentation or open an issue.

## 📄 License

[To be determined]

---

**Status**: MVP Phase 1 Complete ✅  
**Last Updated**: 2025-12-17

## 🎉 Project Status

### ✅ Completed (Phase 1)
- ✅ Project structure (monorepo)
- ✅ Backend API (NestJS) with full CRUD
- ✅ Frontend (Next.js) with authentication
- ✅ Database schema (Prisma)
- ✅ Multi-tenant architecture
- ✅ Authentication & Authorization
- ✅ CRM Core (Contacts, Companies, Pipelines, Deals)
- ✅ Docker setup

### 🚧 In Progress
- Frontend pages for CRM modules
- Telegram integration
- AI features

### 📋 Next Steps
See [QUICKSTART.md](./QUICKSTART.md) to get started!