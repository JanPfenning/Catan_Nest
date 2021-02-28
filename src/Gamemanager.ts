import { Structure } from './Models/Structure';
import { Game } from './game/Game';
import { Playerentity } from './Models/Player';
import { Gamestate } from './Models/Gamestate';

export class Gamemanager {
  private game: Game;
  private player_details: Map<string, Playerentity>;
  readonly GID;
  readonly host_sub: string;

  constructor(game: Game, host_sub: string) {
    this.game = game;
    this.GID = game.GID
    this.host_sub = host_sub;
  }

  setPlayerDetails(details: Map<string, Playerentity>){
    this.player_details = details;
  }

  getGame(): Game {
    return this.game;
  }

  getPlayerDetails(sub: string): Playerentity{
    return this.player_details.get(sub);
  }

  buildStructure(sub: any, structure: Structure, x: number, y: number) {
    // TODO check if user has that structure left to build
    if (this.getGame().state === Gamestate.INITIAL_PLACE){
      switch (structure){
        case Structure.City: {
          const vertex = this.getGame().vertices[x][y];
          vertex.building = structure;
          vertex.owner_id = this.getPlayerDetails(sub).meta.PID;
          vertex.x = x;
          vertex.y = y;
        }
      }
    }else{
      // TODO pay for the acutal building of the structure
    }
    // TODO decrement building amount
  }

  distributeEarnings(points:number):void{
    // TODO distribute earnings to all players
  }

  receiveEarnings(player:Playerentity, eyes:number){
    //TODO add earnings of this round
  }

  nextTurn(){
    this.game.turn++;
    this.game.whos_turn = this.game.players[this.game.turn % this.game.players.length];
  }

  // TODO check this
  prevTurn(){
    this.game.turn++;
    this.game.whos_turn = this.game.players[this.game.players.length - (this.game.turn % this.game.players.length)];
  }

  role_dice(){
    const points = (Math.floor(Math.random() * 6) + 1)+(Math.floor(Math.random() * 6) + 1)
    this.game.roll_history.push(points);
    //Robber turn
    if(points == 7){
      // TODO
    }
    //Normal turn
    else{
      // TODO
      this.distributeEarnings(points);
    }
  }
}
