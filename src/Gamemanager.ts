import { Structure, getCost } from './Models/Structure';
import { Gameobject } from './Gameobject';
import { Playerentity } from './Models/Player';

export class Gamemanager {
  private _gameobject: Gameobject;
  readonly gameid;
  readonly host;

  constructor(gameobject: Gameobject, host: string) {
    this._gameobject = gameobject;
    this.gameid = gameobject.gameid
    this.host = host;
  }

  getGameobject(): Gameobject {
    return this._gameobject;
  }

  buildStructure(issuer: any, structure:Structure, x: number, y: number) {
    // TODO
  }

  distributeEarnings(points:number):void{
    for(const player of this._gameobject.players){
      this.receiveEarnings(player,points);
    }
  }

  receiveEarnings(player:Playerentity, eyes:number){
    //TODO add earnings of this round
    console.log(player.name);
  }

  nextTurn(){
    this._gameobject._current_turn++;
    this._gameobject._turn_playerid = this._gameobject.players[this._gameobject._current_turn%this._gameobject.players.length];
  }


  role_dice(){
    const points = (Math.floor(Math.random() * 6) + 1)+(Math.floor(Math.random() * 6) + 1)
    this._gameobject.cur_eyes = points;
    //Robber turn
    if(points == 7){

    }
    //Normal turn
    else{
      this.distributeEarnings(points);
    }
  }
}
