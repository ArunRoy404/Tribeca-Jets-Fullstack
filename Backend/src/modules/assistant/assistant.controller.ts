import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { StaffOnly } from '../../common/decorators/access.decorator.js';
import { AccessGuard } from '../../common/guards/access.guard.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { AssistantService } from './assistant.service.js';
import { AskAssistantDto, AssistantSuggestionsQueryDto } from './dto/assistant.dto.js';

@ApiTags('Assistant')
@StaffOnly()
@UseGuards(AccessGuard)
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Get('suggestions')
  @ApiOperation({
    summary: 'Context-aware starter prompts for the Command Center Assistant',
  })
  suggestions(@Query() query: AssistantSuggestionsQueryDto) {
    return this.assistant.suggestions(query.context);
  }

  @Post('ask')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ask the Command Center Assistant a live data or workflow question',
    description:
      'Answers questions about the caller’s own scoped quotes, trips, invoices, clients, open trip requests, tasks, and CRM workflows, returning structured items with direct navigation links.',
  })
  ask(@CurrentUser() user: AuthenticatedUser, @Body() body: AskAssistantDto) {
    return this.assistant.ask(user, body);
  }
}
