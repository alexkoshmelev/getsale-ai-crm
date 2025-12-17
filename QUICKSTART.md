# 🚀 Quick Start Guide

## За 5 минут до запуска

### 1. Установка зависимостей
```bash
pnpm install
```

### 2. Запуск Docker (PostgreSQL + Redis)
```bash
docker-compose up -d
```

### 3. Настройка базы данных
```bash
cd apps/api
cp .env.example .env
# Отредактируйте .env и установите JWT_SECRET и JWT_REFRESH_SECRET

pnpm prisma:generate
pnpm migrate:dev
cd ../..  # Вернуться в корневую директорию
```

### 4. Запуск приложения
```bash
# Из корневой директории
pnpm dev
```

## 🎯 Что готово

### Backend (NestJS)
✅ Полная схема базы данных (Prisma)
✅ Аутентификация (JWT, signup/signin)
✅ Multi-tenant организации
✅ CRM модули (Contacts, Companies)
✅ Pipelines & Deals
✅ Chats & Messages
✅ Swagger документация

### Frontend (Next.js)
✅ Страницы авторизации
✅ Dashboard
✅ Базовая навигация
✅ API клиент с interceptors
✅ State management (Zustand)

## 📍 Endpoints

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api/v1
- **API Docs**: http://localhost:3001/api/v1/docs

## 🔑 Тестовый пользователь

После seed:
- Email: `test@example.com`
- Password: `test123` (нужно обновить в seed.ts)

## 📝 Следующие шаги

1. Создать страницы для Contacts, Companies, Pipelines
2. Добавить Telegram интеграцию
3. Реализовать AI функции
4. Добавить биллинг

## 🐛 Проблемы?

Смотрите [SETUP.md](./SETUP.md) для детальной информации.

