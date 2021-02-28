import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { GameService } from '../game/game.service';
import { LobbyService } from '../lobby/lobby.service';
import { Playerentity } from '../Models/Player';

@Controller('creation')
export class CreationController {

  gameService: GameService;
  lobbyService: LobbyService;

  constructor(gameService: GameService,
              lobbyService: LobbyService) {
    this.gameService = gameService;
    this.lobbyService = lobbyService;
  }

  @Post()
  newGame(@Req() req,@Body()payload:any): number{
    const id = this.gameService.newGame(payload, req.user.sub);
    this.lobbyService.newLobby(id,payload,req.user.sub);
    return id;
  }

  @Delete(':id')
  delGame(@Param('id')id:number, @Req() req): boolean{
    return this.gameService.delGame(+id, req.user.sub);
  }

  @Post(':id')
  changePlayer(@Param('id')id:number, @Req() req, @Body() payload): void{
    return this.lobbyService.updatePlayer(+id, payload, req.user.sub);
  }

  @Post('/game/:id')
  startGame(@Param('id')id:number, @Req() req, @Body() payload): boolean{
    return this.gameService.startGame(+id,req.user.sub, payload);
  }

  @Get(':id')
  getPass(@Param('id')id:number, @Req() req): string{
    return this.lobbyService.getPass(+id, req.user.sub);
  }
}
