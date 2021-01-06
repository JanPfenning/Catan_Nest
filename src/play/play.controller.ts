import { Controller, Param, Post, Req } from '@nestjs/common';
import { GameService } from '../game/game.service';

@Controller('play')
export class PlayController {

  gameService: GameService

  constructor(gameService: GameService) {
    this.gameService = gameService;
  }

  @Post(':id/dice')
  dice(@Req() req,@Param('id')id:number): void{
    this.gameService.dice(id,req.user.sub);
  }

  // TODO other funtions of the service

}
