import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TrustSafetyService } from '../trust-safety/trust-safety.service';

interface ImportContact {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  companyName?: string;
  tags?: string[];
}

@Injectable()
export class ContactsImportService {
  private readonly logger = new Logger(ContactsImportService.name);

  constructor(
    private prisma: PrismaService,
    private trustSafetyService: TrustSafetyService,
  ) {}

  /**
   * Import contacts from CSV data
   */
  async importFromCSV(
    organizationId: string,
    csvData: ImportContact[],
    options: {
      skipDuplicates?: boolean;
      validateEmails?: boolean;
      checkOptOut?: boolean;
    } = {},
  ) {
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const row of csvData) {
      try {
        // Validate required fields
        if (!row.email && !row.phone) {
          results.errors.push(`Row missing email and phone: ${JSON.stringify(row)}`);
          results.skipped++;
          continue;
        }

        // Check opt-out if enabled
        if (options.checkOptOut) {
          if (await this.trustSafetyService.isOptedOut(organizationId, undefined, row.email, row.phone)) {
            results.skipped++;
            continue;
          }
        }

        // Check duplicates
        if (options.skipDuplicates) {
          const existing = await this.prisma.contact.findFirst({
            where: {
              organizationId,
              OR: [
                ...(row.email ? [{ email: row.email }] : []),
                ...(row.phone ? [{ phone: row.phone }] : []),
              ],
            },
          });

          if (existing) {
            results.skipped++;
            continue;
          }
        }

        // Validate email format
        if (options.validateEmails && row.email && !this.isValidEmail(row.email)) {
          results.errors.push(`Invalid email: ${row.email}`);
          results.skipped++;
          continue;
        }

        // Find or create company
        let companyId: string | undefined;
        if (row.companyName) {
          const company = await this.prisma.company.upsert({
            where: {
              organizationId_name: {
                organizationId,
                name: row.companyName,
              },
            },
            create: {
              organizationId,
              name: row.companyName,
            },
            update: {},
          });
          companyId = company.id;
        }

        // Create contact
        await this.prisma.contact.create({
          data: {
            organizationId,
            companyId,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            phone: row.phone,
            role: row.role,
            tags: row.tags || [],
            source: 'import',
          },
        });

        results.imported++;
      } catch (error: any) {
        results.errors.push(`Error importing row: ${error.message}`);
        results.skipped++;
      }
    }

    return results;
  }

  /**
   * Deduplicate contacts
   */
  async deduplicate(organizationId: string) {
    const contacts = await this.prisma.contact.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });

    const seen = new Map<string, string>(); // email/phone -> contactId
    const duplicates: string[] = [];

    for (const contact of contacts) {
      const key = contact.email || contact.phone;
      if (!key) continue;

      if (seen.has(key)) {
        duplicates.push(contact.id);
      } else {
        seen.set(key, contact.id);
      }
    }

    // Delete duplicates (keep first occurrence)
    if (duplicates.length > 0) {
      await this.prisma.contact.deleteMany({
        where: {
          id: { in: duplicates },
        },
      });
    }

    return {
      total: contacts.length,
      duplicates: duplicates.length,
      removed: duplicates.length,
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

