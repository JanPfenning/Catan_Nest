import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Req } from '@nestjs/common';
import { GameService } from '../game/game.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Edge } from '../Models/Edge';
import { Resource } from '../Models/Resource';

@ApiBearerAuth()
@ApiTags('play')
@Controller('play')
export class PlayController {

  gameService: GameService

  constructor(gameService: GameService) {
    this.gameService = gameService;
  }

  @ApiParam({name: 'id', description: 'Game ID', allowEmptyValue: false, type: 'string', required: true})
  @ApiOperation({description: 'returns full information about the Issuer. Can only be issued with the corresponding SUB to the data inside the request'})
  @Get(':id/issuerPlayerdata')
  personalData(@Req() req,@Param('id')id:number): string {
    try{
      return this.gameService.personalData(+id, req.user.sub);
    }catch (e) {
      throw new HttpException('The Game you want to get Info from does not exist', HttpStatus.BAD_REQUEST);
    }
  }

  @ApiParam({name: 'id', description: 'Game ID', allowEmptyValue: false, type: 'string', required: true})
  @ApiOperation({description: 'Leads to generating two random numbers between 1 and 6. Will also distribute earnings'})
  @Post(':id/dice')
  dice(@Req() req,@Param('id')id:number): void{
    this.gameService.dice(+id,req.user.sub);
  }

  @ApiParam({name: 'id', description: 'Game ID', allowEmptyValue: false, type: 'string', required: true})
  @ApiOperation({description: 'Shuffles the array of players'})
  @Post(':id/determineOrder')
  determineOrder(@Req() req,@Param('id')id:number): void {
    this.gameService.determineOrder(+id, req.user.sub);
  }

  @ApiParam({name: 'id', description: 'Game ID', allowEmptyValue: false, type: 'string', required: true})
  @ApiOperation({description: 'Places the building'})
  @Post(':id/build')
  build(@Req() req,@Param('id')id:number, @Body() payload:any): void {
    this.gameService.build(+id, req.user.sub, payload.structure, payload.x, payload.y);
  }

  @ApiParam({name: 'id', description: 'Game ID', allowEmptyValue: false, type: 'string', required: true})
  @ApiOperation({description: 'Changes the Gamestate and Whos turn it is'})
  @Post(':id/nextTurn')
  nextTurn(@Req() req,@Param('id')id:number): void {
    this.gameService.nextTurn(+id, req.user.sub);
  }
  
  @ApiParam({name: 'id', description: 'Game ID', allowEmptyValue: false, type: 'string', required: true})
  @ApiOperation({description: 'Post a request for trading resources'})
  @Post(':id/trade_req')
  request_trade(@Req() req,@Param('id')GID:number, @Body()payload: any): void {
    this.gameService.requestTrade(+GID, req.user.sub, {brick: payload.brick,
                                                       lumber: payload.lumber,
                                                       wool: payload.wool,
                                                       grain: payload.grain,
                                                       ore: payload.ore});
  }

  @ApiParam({name: 'id', description: 'Game ID', allowEmptyValue: false, type: 'string', required: true})
  @ApiOperation({description: 'Accept trade, so trade issuer can choose to execute trade with acceptance issuer'})
  @Post(':id/trade_accept')
  accept_trade(@Req() req,@Param('id')GID:number): void {
    this.gameService.accepptTrade(+GID, req.user.sub);
  }

  @ApiParam({name: 'id', description: 'Game ID', allowEmptyValue: false, type: 'string', required: true})
  @ApiOperation({description: 'Choose Tradepartner and exchanges the resources'})
  @Post(':id/choose_trade_partner')
  execute_trade(@Req() req,@Param('id')GID:number, @Body()payload: {PID}): void {
    this.gameService.executeTrade(+GID, req.user.sub, payload.PID);
  }

  @ApiParam({name: 'id', description: 'Game ID', allowEmptyValue: false, type: 'string', required: true})
  @ApiOperation({description: 'Cancel Trade'})
  @Post(':id/trade_cancel')
  cancel_trade(@Req() req,@Param('id')GID:number): void {
    this.gameService.cancelTrade(+GID, req.user.sub);
  }

  @ApiParam({name: 'id', description: 'Game ID', allowEmptyValue: false, type: 'string', required: true})
  @ApiOperation({description: 'Cancel acceptance of trade'})
  @Post(':id/cancel_acceptance')
  cancel_acceptance(@Req() req,@Param('id')GID:number): void {
    this.gameService.cancel_acceptance(+GID, req.user.sub);
  }

  @ApiParam({name: 'id', description: 'Game ID', allowEmptyValue: false, type: 'string', required: true})
  @ApiOperation({description: 'Buy a Developmentcard'})
  @Post(':id/buy_dev')
  buyDev(@Req() req,@Param('id')GID:number): void {
    this.gameService.buyDev(+GID, req.user.sub);
  }

  @ApiParam({name: 'id', description: 'Game ID', allowEmptyValue: false, type: 'string', required: true})
  @ApiOperation({description: 'Use developmentcard Roadbuilding'})
  @Post(':id/dev_road')
  useRoadbuilding(@Req() req,@Param('id')GID:number, @Body() payload: {structure1: Edge, structure2: Edge}): void {
    this.gameService.useRoadbuilding(+GID, req.user.sub, payload);
  }

  @ApiParam({name: 'id', description: 'Game ID', allowEmptyValue: false, type: 'string', required: true})
  @ApiOperation({description: 'Use developmentcard YearOfPlenty'})
  @Post(':id/dev_yop')
  useYOP(@Req() req,@Param('id')GID:number, @Body() payload: {resource1: Resource, resource2: Resource}): void {
    this.gameService.useYOP(+GID, req.user.sub, payload);
  }

  @ApiParam({name: 'id', description: 'Game ID', allowEmptyValue: false, type: 'string', required: true})
  @ApiOperation({description: 'Use developmentcard Monopoly'})
  @Post(':id/dev_monopoly')
  useMonopoly(@Req() req,@Param('id')GID:number, @Body() payload: {resource}): void {
    this.gameService.useMonopoly(+GID, req.user.sub, payload);
  }

  @ApiParam({name: 'id', description: 'Game ID', allowEmptyValue: false, type: 'string', required: true})
  @ApiOperation({description: 'Use developmentcard Knight'})
  @Post(':id/dev_knight')
  useKnight(@Req() req,@Param('id')GID:number): void {
    this.gameService.useKnight(+GID, req.user.sub);
  }

  @ApiParam({name: 'id', description: 'Game ID', allowEmptyValue: false, type: 'string', required: true})
  @ApiOperation({description: 'Place the Robber to block a hex'})
  @Post(':id/halfResources')
  halfResources(@Req() req,@Param('id')GID:number, @Body() payload: {brick, lumber, wool, grain, ore}): void {
    this.gameService.halfResources(+GID, req.user.sub, payload);
  }

  @ApiParam({name: 'id', description: 'Game ID', allowEmptyValue: false, type: 'string', required: true})
  @ApiOperation({description: 'Place the Robber to block a hex'})
  @Post(':id/placeRobber')
  placeRobber(@Req() req,@Param('id')GID:number, @Body() payload: {hex}): void {
    this.gameService.placeRobber(+GID, req.user.sub, payload);
  }

  @ApiParam({name: 'id', description: 'Game ID', allowEmptyValue: false, type: 'string', required: true})
  @ApiOperation({description: 'Place the Robber to block a hex'})
  @Post(':id/chooseVictim')
  chooseVictim(@Req() req,@Param('id')GID:number, @Body() payload: {PID}): void {
    this.gameService.chooseVictim(+GID, req.user.sub, payload);
  }

  @ApiParam({name: 'id', description: 'Game ID', allowEmptyValue: false, type: 'string', required: true})
  @ApiOperation({description: 'Choose the resources from goldsource'})
  @Post(':id/requestGold')
  requestGold(@Req() req,@Param('id')GID:number, @Body()payload: any): void {
    this.gameService.requestGoldResources(+GID, req.user.sub, {brick: payload.brick,
                                                                lumber: payload.lumber,
                                                                wool: payload.wool,
                                                                grain: payload.grain,
                                                                ore: payload.ore});
  }
}
