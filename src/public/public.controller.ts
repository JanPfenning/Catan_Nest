import { Controller, Get, Param, Post, Req } from '@nestjs/common';

@Controller('public')
export class PublicController {
  @Get('ping')
  pong(): string{
    return 'pong';
  }
}
