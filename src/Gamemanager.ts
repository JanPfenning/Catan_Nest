import { Structure, getCost } from './Models/Structure';
import { Game } from './game/Game';
import { Playerentity } from './Models/Player';

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

  buildStructure(issuer: any, structure:Structure, x: number, y: number) {
    // TODO
  }

  distributeEarnings(points:number):void{
    // TODO
  }

  receiveEarnings(player:Playerentity, eyes:number){
    //TODO add earnings of this round
  }

  nextTurn(){
    this.game.turn++;
    // TODO determine next player via modulo
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
      this.distributeEarnings(points);
    }
  }
}
