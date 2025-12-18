import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { ContactsImportService } from './contacts-import.service';
import { ContactsController } from './contacts.controller';
import { EventsModule } from '../events/events.module';
import { TrustSafetyModule } from '../trust-safety/trust-safety.module';

@Module({
  imports: [EventsModule, TrustSafetyModule],
  controllers: [ContactsController],
  providers: [ContactsService, ContactsImportService],
  exports: [ContactsService, ContactsImportService],
})
export class ContactsModule {}

