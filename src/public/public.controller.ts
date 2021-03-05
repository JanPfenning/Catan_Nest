import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('public')
@Controller('public')
export class PublicController {
  @Get('ping')
  pong(): string{
    return 'pong';
  }
}
