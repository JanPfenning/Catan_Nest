import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import { GameService } from '../game/game.service';

@Controller('play')
export class PlayController {

  gameService: GameService

  constructor(gameService: GameService) {
    this.gameService = gameService;
  }

  @Get(':id/issuerPlayerdata')
  personalData(@Req() req,@Param('id')id:number): string {
    return JSON.stringify(this.gameService.getGameManager(+id).getPlayerDetails(req.user.sub));
  }

  @Post(':id/dice')
  dice(@Req() req,@Param('id')id:number): void{
    this.gameService.dice(id,req.user.sub);
  }

  @Post(':id/determineOrder')
  determineOrder(@Req() req,@Param('id')id:number): void {
    this.gameService.determineOrder(+id, req.user.sub);
  }

  // TODO other funtions of the service

}
