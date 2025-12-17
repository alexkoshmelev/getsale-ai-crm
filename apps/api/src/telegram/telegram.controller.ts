import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TelegramService } from './telegram.service';

@ApiTags('telegram')
@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Telegram webhook endpoint' })
  async webhook(@Body() update: any) {
    await this.telegramService.handleWebhook(update);
    return { ok: true };
  }
}

