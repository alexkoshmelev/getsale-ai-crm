import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ContactsModule } from './contacts/contacts.module';
import { CompaniesModule } from './companies/companies.module';
import { PipelinesModule } from './pipelines/pipelines.module';
import { DealsModule } from './deals/deals.module';
import { ChatsModule } from './chats/chats.module';
import { MessagesModule } from './messages/messages.module';
import { TelegramModule } from './telegram/telegram.module';
import { BillingModule } from './billing/billing.module';
import { AIModule } from './ai/ai.module';
import { AgentsModule } from './agents/agents.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { EmailModule } from './email/email.module';
import { EventsModule } from './events/events.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { WebSocketModule } from './websocket/websocket.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TriggersModule } from './triggers/triggers.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ContactsModule,
    CompaniesModule,
    PipelinesModule,
    DealsModule,
    ChatsModule,
    MessagesModule,
    TelegramModule,
    BillingModule,
    AIModule,
    AgentsModule,
    AnalyticsModule,
    EmailModule,
    EventsModule,
    CampaignsModule,
    WebSocketModule,
    NotificationsModule,
    TriggersModule,
  ],
})
export class AppModule {}

