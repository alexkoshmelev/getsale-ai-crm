import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { SendEmailDto } from './dto/send-email.dto';

@ApiTags('email')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send email to contact' })
  async sendEmail(
    @OrganizationId() organizationId: string,
    @Body() sendEmailDto: SendEmailDto,
  ) {
    return this.emailService.sendEmailToContact(
      sendEmailDto.contactId,
      organizationId,
      sendEmailDto.subject,
      sendEmailDto.text,
      sendEmailDto.html,
    );
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Email webhook endpoint (for incoming emails)' })
  async webhook(@Body() payload: any) {
    // This would be called by your email service provider (e.g., SendGrid, Mailgun)
    // Parse the incoming email and handle it
    await this.emailService.handleIncomingEmail(
      payload.from,
      payload.to,
      payload.subject,
      payload.text || payload.body,
      payload.html,
    );
    return { received: true };
  }
}

