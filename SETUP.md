# Setup Guide

## Prerequisites

- Node.js 18+ 
- pnpm 8+ (or npm/yarn)
- Docker & Docker Compose
- PostgreSQL 15+ (via Docker)
- Redis 7+ (via Docker)

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Docker Services

```bash
docker-compose up -d
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379

### 3. Setup Environment Variables

Copy the example environment file:

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` and update:
- `JWT_SECRET` - Generate a random secret
- `JWT_REFRESH_SECRET` - Generate another random secret
- Other API keys as needed

### 4. Setup Database

```bash
# Generate Prisma Client
cd apps/api
pnpm prisma:generate

# Run migrations
pnpm migrate:dev

# (Optional) Seed database
pnpm db:seed

# Return to root directory
cd ../..
```

### 5. Start Development Servers

From the root directory:

```bash
pnpm dev
```

This will start:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/v1
- API Docs: http://localhost:3001/api/v1/docs

## Project Structure

```
getsale-ai-crm/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── packages/         # Shared packages (future)
├── docker-compose.yml
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - Register new user
- `POST /api/v1/auth/signin` - Sign in
- `POST /api/v1/auth/refresh` - Refresh token

### Organizations
- `GET /api/v1/organizations` - List organizations
- `POST /api/v1/organizations` - Create organization
- `GET /api/v1/organizations/:id` - Get organization
- `PATCH /api/v1/organizations/:id` - Update organization

### Contacts
- `GET /api/v1/contacts` - List contacts
- `POST /api/v1/contacts` - Create contact
- `GET /api/v1/contacts/:id` - Get contact
- `PATCH /api/v1/contacts/:id` - Update contact
- `DELETE /api/v1/contacts/:id` - Delete contact

### Companies
- `GET /api/v1/companies` - List companies
- `POST /api/v1/companies` - Create company
- `GET /api/v1/companies/:id` - Get company
- `PATCH /api/v1/companies/:id` - Update company

### Pipelines
- `GET /api/v1/pipelines` - List pipelines
- `POST /api/v1/pipelines` - Create pipeline
- `GET /api/v1/pipelines/:id` - Get pipeline

### Deals
- `GET /api/v1/deals` - List deals
- `POST /api/v1/deals` - Create deal
- `PATCH /api/v1/deals/:id/stage` - Update deal stage

## Testing

### Test User (from seed)
- Email: `test@example.com`
- Password: `test123` (you'll need to update this in seed.ts)

## Troubleshooting

### Database Connection Issues
- Ensure Docker containers are running: `docker-compose ps`
- Check database URL in `.env` matches Docker setup
- Try: `docker-compose restart postgres`

### Port Already in Use
- Change ports in `docker-compose.yml` or `.env` files
- Kill processes using ports 3000, 3001, 5432, 6379

### Prisma Issues
- Run `pnpm prisma:generate` in `apps/api`
- Check `DATABASE_URL` in `.env`
- Ensure migrations are up to date: `pnpm migrate:dev`

## Next Steps

1. Complete frontend pages (contacts, companies, pipelines)
2. Add Telegram integration
3. Implement AI features
4. Add billing system
5. Deploy to production

## Development Tips

- Use Swagger docs at `/api/v1/docs` to test API
- Check logs: `docker-compose logs -f`
- Database GUI: `pnpm db:studio` (Prisma Studio)
- Hot reload is enabled for both frontend and backend

