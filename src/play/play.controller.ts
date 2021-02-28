import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { GameService } from '../game/game.service';

@Controller('play')
export class PlayController {

  gameService: GameService

  constructor(gameService: GameService) {
    this.gameService = gameService;
  }

  @Get(':id/issuerPlayerdata')
  personalData(@Req() req,@Param('id')id:number): string {
    return this.gameService.personalData(+id, req.user.sub);
  }

  @Post(':id/dice')
  dice(@Req() req,@Param('id')id:number): void{
    this.gameService.dice(+id,req.user.sub);
  }

  @Post(':id/determineOrder')
  determineOrder(@Req() req,@Param('id')id:number): void {
    this.gameService.determineOrder(+id, req.user.sub);
  }

  @Post(':id/build')
  build(@Req() req,@Param('id')id:number, @Body() payload:any): void {
    this.gameService.build(+id, req.user.sub, payload.structure, payload.x, payload.y);
  }

  @Post(':id/nextTurn')
  nextTurn(@Req() req,@Param('id')id:number): void {
    this.gameService.nextTurn(+id, req.user.sub);
  }
  // TODO other funtions of the service

}
