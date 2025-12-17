# Project Structure

## Recommended Folder Structure

```
getsale-ai-crm/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/            # Next.js 13+ app router
│   │   │   ├── components/     # React components
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── lib/            # Utilities
│   │   │   ├── store/          # Zustand stores
│   │   │   └── types/          # TypeScript types
│   │   ├── public/
│   │   └── package.json
│   │
│   └── api/                     # NestJS backend
│       ├── src/
│       │   ├── auth/
│       │   ├── organizations/
│       │   ├── users/
│       │   ├── contacts/
│       │   ├── companies/
│       │   ├── pipelines/
│       │   ├── deals/
│       │   ├── chats/
│       │   ├── messages/
│       │   ├── campaigns/
│       │   ├── agents/
│       │   ├── analytics/
│       │   ├── billing/
│       │   ├── integrations/
│       │   ├── webhooks/
│       │   └── common/
│       ├── test/
│       └── package.json
│
├── packages/
│   ├── shared/                  # Shared TypeScript types & utils
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── constants/
│   │   │   └── utils/
│   │   └── package.json
│   │
│   ├── ai-engine/               # AI service (separate service)
│   │   ├── src/
│   │   │   ├── agents/
│   │   │   ├── memory/
│   │   │   ├── tools/
│   │   │   ├── guardrails/
│   │   │   └── llm/
│   │   └── package.json
│   │
│   └── database/                # Database migrations & seeds
│       ├── migrations/
│       ├── seeds/
│       └── package.json
│
├── infrastructure/
│   ├── docker/
│   │   ├── Dockerfile.api
│   │   ├── Dockerfile.web
│   │   └── docker-compose.yml
│   ├── kubernetes/
│   │   ├── api/
│   │   ├── web/
│   │   └── ai-engine/
│   └── terraform/               # Infrastructure as code
│
├── docs/
│   ├── api/                     # API documentation
│   ├── architecture/            # Architecture docs
│   └── guides/                   # User guides
│
├── scripts/
│   ├── setup.sh
│   ├── migrate.sh
│   └── seed.sh
│
├── .github/
│   └── workflows/               # CI/CD
│
├── package.json                 # Root package.json (monorepo)
├── pnpm-workspace.yaml          # or yarn workspaces
├── tsconfig.json
└── README.md
```

## Technology Choices

### Frontend Stack
- **Framework**: Next.js 14+ (App Router)
- **UI Library**: React 18+
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: React Query (TanStack Query)
- **Forms**: React Hook Form + Zod
- **UI Components**: shadcn/ui or Radix UI
- **Real-time**: WebSocket (Socket.io client)

### Backend Stack
- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL 15+
- **ORM**: Prisma or TypeORM
- **Cache**: Redis
- **Queue**: BullMQ (Redis-based)
- **Real-time**: Socket.io
- **Validation**: class-validator + class-transformer

### AI Stack
- **LLM Provider**: OpenAI API (primary), Anthropic (fallback)
- **Framework**: LangChain.js or custom
- **Vector DB**: pgvector (PostgreSQL extension)
- **Embeddings**: OpenAI text-embedding-ada-002

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack or CloudWatch
- **Error Tracking**: Sentry

## Development Setup

### Prerequisites
- Node.js 18+
- pnpm (or yarn/npm)
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### Initial Setup
```bash
# Clone repository
git clone <repo-url>
cd getsale-ai-crm

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Start local services (PostgreSQL, Redis)
docker-compose up -d

# Run database migrations
pnpm run migrate

# Seed database (optional)
pnpm run seed

# Start development servers
pnpm run dev
```

## Environment Variables

### API Service (.env)
```env
# App
NODE_ENV=development
PORT=3001
API_PREFIX=api/v1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/getsale_crm
DATABASE_SSL=false

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# OpenAI
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4

# Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password

# Webhooks
WEBHOOK_SECRET=your-webhook-secret

# File Storage
STORAGE_PROVIDER=local # or s3
AWS_S3_BUCKET=your-bucket
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Development Workflow

### Branch Strategy
- `main` - Production
- `develop` - Staging/Development
- `feature/*` - Feature branches
- `fix/*` - Bug fixes
- `release/*` - Release preparation

### Commit Convention
```
feat: add AI agent configuration
fix: resolve chat message ordering
docs: update API documentation
refactor: improve database queries
test: add unit tests for contacts
chore: update dependencies
```

### Code Quality
- ESLint + Prettier
- TypeScript strict mode
- Pre-commit hooks (Husky)
- Automated tests (Jest/Vitest)

## API Versioning

- URL-based: `/api/v1/...`
- Header-based: `Accept: application/vnd.api+json;version=1`
- Backward compatibility maintained for at least 2 versions

## Testing Strategy

### Unit Tests
- Services
- Utilities
- AI agent logic

### Integration Tests
- API endpoints
- Database operations
- External service integrations

### E2E Tests
- Critical user flows
- AI agent workflows
- Billing flows

### Test Coverage Target
- Minimum 70% code coverage
- 100% for critical paths (auth, billing, AI)

## Documentation Standards

### API Documentation
- OpenAPI/Swagger specification
- Auto-generated from code annotations
- Interactive API explorer

### Code Documentation
- JSDoc for public APIs
- README in each module
- Architecture decision records (ADRs)

## Performance Targets

- API response time: < 200ms (p95)
- Chat message delivery: < 100ms
- AI draft generation: < 5s
- Page load time: < 2s
- Database query time: < 50ms (p95)

## Security Checklist

- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Rate limiting
- [ ] Authentication & authorization
- [ ] Data encryption at rest
- [ ] TLS in transit
- [ ] Secure secrets management
- [ ] Regular security audits
- [ ] Dependency vulnerability scanning

