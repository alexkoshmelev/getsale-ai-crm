# AI CRM SaaS – Master Development Plan

## 1. Цель продукта

Создать AI-first CRM SaaS для B2B / cold outreach / BizDev команд, который объединяет:

- **CRM** (контакты, компании, воронки)
- **Коммуникации** (Telegram-first, далее email, LinkedIn, WhatsApp)
- **AI-агенты** (BizDev / SDR / ассистенты)
- **Дашборд управления BiDi**
- **Массовый и триггерный аутрич**
- **Метрики, аналитику и автоматизацию**

### Ключевое позиционирование:

**"CRM + BizDev OS + AI Cold Outreach Engine"**

### Референсы:

- `crmchat.ai` → чат-центричный CRM
- `nreach.io` → аутрич, автоматизация, data-driven

---

## 2. Принципы архитектуры (Best Practices)

### 2.1 SaaS Principles

- **Multi-tenant архитектура**
- **RBAC** (Roles & Permissions)
- **Usage-based + Subscription billing**
- **Event-driven backend**
- **API-first**
- **Audit logs**
- **Webhooks**

### 2.2 AI-First Principles

- AI не «фича», а core workflow
- Все действия → events → AI agents
- Agents имеют:
  - **Memory** (contextual + long-term)
  - **Goals**
  - **Tools**
  - **Guardrails**

### 2.3 Messaging-first UX

- Интерфейс как Telegram
- CRM данные встроены прямо в чат
- Минимум форм, максимум диалогов

---

## 3. Основные домены системы

### 3.1 Identity & Access

- Sign Up / Sign In
- OAuth (Google, Telegram)
- MFA
- Sessions / Tokens

### 3.2 Organizations (Companies)

- Company (workspace)
- Settings
- Billing owner
- Members
- Roles

### 3.3 Users & Roles

- **Owner**
- **Admin**
- **BiDi**
- **Viewer**
- **AI Agent** (system role)

---

## 4. CRM Core

### 4.1 Контакты

**Контакт:**
- Имя
- Роль
- Компания
- Telegram / Email / LinkedIn
- Tags
- Notes
- Source
- Импорт (CSV, API)
- Enrichment (позже)

### 4.2 Компании

- Название
- Индустрия
- Описание
- Размер
- Stage

---

## 5. Воронка (Pipeline)

### 5.1 Структура

- Несколько pipelines на компанию
- **Stages:**
  - Cold
  - Replied
  - Qualified
  - Meeting
  - Deal
  - Lost

### 5.2 Логика

- Автоматический переход по событиям
- Ручной drag & drop (kanban-like)
- AI рекомендации переходов

### 5.3 События

- Ответ в чате
- Назначение встречи
- Ключевые слова

---

## 6. Чаты (Core Feature)

### 6.1 Chat Engine

- Telegram-style UI
- 1:1 чаты
- Unified Inbox
- Непрочитанные
- AI replies draft

### 6.2 Chat Context Panel

- Контакт
- Компания
- Stage
- Last actions
- AI summary

### 6.3 Ответы

- Ручные
- AI-assisted
- Fully autonomous (opt-in)

---

## 7. AI Agents System (Ключевой модуль)

### 7.1 Типы агентов

- **BizDev Agent**
- **SDR Agent**
- **Follow-up Agent**
- **Analytics Agent**
- **Admin Agent**

### 7.2 Архитектура агента

- **Prompt Template**
- **Tools:**
  - CRM Read/Write
  - Chat Send
  - Calendar
  - Webhooks
- **Memory:**
  - Short-term (thread)
  - Long-term (vector DB)

### 7.3 Guardrails

- Rate limits
- Message approval flows
- Tone & compliance rules

---

## 8. Cold Outreach Engine

### 8.1 Кампании

- Campaign
- Target audience
- Message templates
- Triggers

### 8.2 Триггеры

- New contact
- Stage change
- Time-based
- AI decision

### 8.3 Шаблоны

- Variables
- Conditional blocks
- Multi-step sequences

---

## 9. Calendar & Meetings

- Google Calendar
- Outlook
- Booking links
- Auto-create events
- AI follow-ups after meetings

---

## 10. Notifications System

- In-app
- Email
- Telegram bot
- Webhooks

**События:**
- New reply
- Stage change
- Payment issue
- AI alert

---

## 11. Integrations

### CRM
- HubSpot
- Salesforce
- Pipedrive

### Messaging
- Telegram (MVP)
- Email (SMTP)
- WhatsApp (later)

### Data
- Zapier / Make
- Webhooks

---

## 12. Billing & Payments

### 12.1 Fiat
- Stripe
- Subscriptions
- Seats
- Usage-based (messages, AI calls)

### 12.2 Crypto
- USDT / USDC
- Wallet-based payments
- On-chain invoices

### 12.3 Plans
- Free
- Pro
- Team
- Enterprise

---

## 13. Analytics & Metrics

### Company Metrics
- Replies rate
- Meetings booked
- Conversion by stage

### BiDi Metrics
- Messages sent
- Replies
- Deals

### AI Metrics
- Success rate
- Override rate

---

## 14. Tech Stack (Рекомендованный)

### Frontend
- React / Next.js
- Tailwind
- Zustand / React Query

### Backend
- Node.js / NestJS
- PostgreSQL
- Redis
- Event bus

### AI
- LLM (OpenAI / local Llama)
- LangChain / custom agent framework
- Vector DB

### Infra
- Docker
- Kubernetes
- n8n (automation)

---

## 15. MVP Roadmap

### Phase 1 (MVP)
- ✅ Auth
- ✅ CRM core
- ✅ Telegram chats
- ✅ Simple pipeline
- ✅ Manual replies

### Phase 2
- AI replies
- Outreach campaigns
- Billing

### Phase 3
- Full agents
- Integrations
- Analytics

---

## 16. Database Schema (High-Level)

### Core Tables
- `organizations` - Workspaces/companies
- `users` - User accounts
- `organization_members` - User-org relationships with roles
- `contacts` - CRM contacts
- `companies` - Company records
- `pipelines` - Sales pipelines
- `stages` - Pipeline stages
- `deals` - Deals/opportunities
- `chats` - Chat conversations
- `messages` - Chat messages
- `campaigns` - Outreach campaigns
- `ai_agents` - AI agent configurations
- `events` - Event log for audit and triggers
- `integrations` - Third-party integrations
- `subscriptions` - Billing subscriptions
- `usage_logs` - Usage tracking for billing

---

## 17. API Structure (High-Level)

### Authentication
- `POST /auth/signup`
- `POST /auth/signin`
- `POST /auth/oauth/{provider}`
- `POST /auth/refresh`
- `POST /auth/logout`

### Organizations
- `GET /organizations`
- `POST /organizations`
- `GET /organizations/:id`
- `PATCH /organizations/:id`
- `DELETE /organizations/:id`
- `GET /organizations/:id/members`
- `POST /organizations/:id/members`
- `DELETE /organizations/:id/members/:userId`

### CRM
- `GET /contacts`
- `POST /contacts`
- `GET /contacts/:id`
- `PATCH /contacts/:id`
- `DELETE /contacts/:id`
- `POST /contacts/import`
- `GET /companies`
- `POST /companies`
- `GET /companies/:id`
- `PATCH /companies/:id`

### Pipelines
- `GET /pipelines`
- `POST /pipelines`
- `GET /pipelines/:id`
- `PATCH /pipelines/:id`
- `GET /pipelines/:id/deals`
- `POST /pipelines/:id/deals`
- `PATCH /deals/:id`

### Chats
- `GET /chats`
- `GET /chats/:id`
- `GET /chats/:id/messages`
- `POST /chats/:id/messages`
- `POST /chats/:id/messages/ai-draft`

### AI Agents
- `GET /agents`
- `POST /agents`
- `GET /agents/:id`
- `PATCH /agents/:id`
- `POST /agents/:id/execute`

### Campaigns
- `GET /campaigns`
- `POST /campaigns`
- `GET /campaigns/:id`
- `POST /campaigns/:id/start`
- `POST /campaigns/:id/stop`

### Analytics
- `GET /analytics/company`
- `GET /analytics/bidi`
- `GET /analytics/ai`

### Billing
- `GET /billing/subscription`
- `POST /billing/subscription`
- `GET /billing/usage`
- `POST /billing/payment-method`

### Webhooks
- `GET /webhooks`
- `POST /webhooks`
- `DELETE /webhooks/:id`
- `POST /webhooks/:id/test`

---

## 18. Security Considerations

- **Data Isolation**: Strict multi-tenant data isolation
- **API Security**: Rate limiting, API keys, OAuth
- **Encryption**: Data at rest and in transit
- **Compliance**: GDPR, SOC 2 (future)
- **Audit Logging**: All critical actions logged
- **Input Validation**: Sanitization and validation on all inputs
- **AI Safety**: Content filtering, guardrails, approval workflows

---

## 19. Performance Requirements

- **API Response Time**: < 200ms (p95)
- **Chat Real-time**: < 100ms latency
- **AI Response**: < 5s for drafts
- **Concurrent Users**: Support 10k+ per organization
- **Scalability**: Horizontal scaling ready

---

## 20. Monitoring & Observability

- **Application Metrics**: Response times, error rates
- **Business Metrics**: Active users, messages sent, deals closed
- **AI Metrics**: Agent success rates, token usage
- **Infrastructure**: CPU, memory, database performance
- **Alerts**: Critical errors, performance degradation, billing issues

---

## 21. Development Workflow

### Git Strategy
- Main branch (production)
- Develop branch (staging)
- Feature branches
- Release branches

### CI/CD
- Automated tests
- Code quality checks
- Deployment pipelines
- Staging → Production

### Testing Strategy
- Unit tests
- Integration tests
- E2E tests
- AI agent testing framework

---

## 22. Documentation Requirements

- **API Documentation**: OpenAPI/Swagger
- **User Guides**: Onboarding, features, best practices
- **Developer Docs**: Architecture, setup, contribution
- **AI Agent Docs**: Configuration, customization, guardrails

---

## 23. Success Metrics (KPIs)

### Product Metrics
- Monthly Active Users (MAU)
- Daily Active Users (DAU)
- Retention rate (30/60/90 days)
- Feature adoption rate

### Business Metrics
- MRR (Monthly Recurring Revenue)
- Churn rate
- Customer LTV
- Conversion rate (trial → paid)

### AI Metrics
- AI reply acceptance rate
- Agent task success rate
- Human override rate
- Time saved per user

---

## 24. Risk Assessment

### Technical Risks
- AI reliability and accuracy
- Scalability challenges
- Integration complexity
- Data privacy concerns

### Business Risks
- Market competition
- Customer acquisition cost
- Regulatory changes
- AI technology evolution

### Mitigation Strategies
- Phased rollout
- Beta testing program
- Continuous monitoring
- Flexible architecture

---

## 25. Future Enhancements (Post-MVP)

- Advanced AI models (fine-tuned)
- Voice calls integration
- Video meetings
- Mobile apps (iOS/Android)
- Advanced analytics (ML predictions)
- Custom AI agent builder
- Marketplace for integrations
- White-label solution

