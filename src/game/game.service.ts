import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Gamemanager } from '../Gamemanager';
import { MqttClient } from 'mqtt';
import { Structure } from '../Models/Structure';
import { BuildingResource } from '../Models/BuildingResource';
import { Game } from './Game';
import { LobbyService } from '../lobby/lobby.service';
import { Meta } from '../Models/Player';
import { Gamestate } from '../Models/Gamestate';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mqtt = require('mqtt');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv').config();

@Injectable()
export class GameService {
  private gameManager: Map<number, Gamemanager>;
  private gameIdAtomic = 0;
  private client: MqttClient;
  private lobbyService;

  constructor(lobbyService: LobbyService) {
    this.lobbyService = lobbyService;
    this.gameManager = new Map<number, Gamemanager>();
    this.client = mqtt.connect(process.env.MQTT_HOST,
      {
        clientId: process.env.MQTT_PLAY_CLIENT_ID,
        port: process.env.MQTT_PORT,
        username: process.env.MQTT_USER,
        password: process.env.MQTT_PASSWORD,
        protocol: process.env.MQTT_PROTOCOL
      })
    this.client.on('connect', () => {
      console.log('Game: connected to mqtt broker')
      //this.client.subscribe(process.env.MQTT_GAME + '#')
      //console.log(`listening to ${process.env.MQTT_GAME}#`)
    })
    this.client.on('message', (topic, msg) => {
      //console.log(`${topic}: ${msg}`);
    });
    this.client.on('error', (error) => {
      console.log(`ERROR: ${error}`);
      process.exit(2);
    });
    /*
    this.client.on('close', () => {
      this.reconnecting = true;
      while(!this.client.connected){
        console.log('trying to reconnect')
        this.client.reconnect();
      }
    })
     */
  }

  getGameManager(id: number): Gamemanager{
    return this.gameManager.get(id);
  }

  newGame(meta_data: any, sub: string): number{
    //console.log(meta_data)
    const gm = new Gamemanager(
      new Game(
        this.gameIdAtomic++,
        meta_data.pointsToWin,
        meta_data.hexes,
        meta_data.harbours,
        meta_data.max_res,
        meta_data.max_dev)
      , sub)
    this.gameManager.set(gm.GID,gm);
    return gm.GID
  }

  /**
   * @param GID GameID which corresponding Game is to be deleted
   * @param sub Issuer
   */
  delGame(GID: number, sub: any) {
    //Only hosts are allowed to delete games via request
    if (this.gameManager.get(GID).host_sub === sub){
      return this.gameManager.delete(GID);
    }
    else{
      throw new HttpException('Its not your game, only hosts can delete games', HttpStatus.BAD_REQUEST);
    }
  }

  //TODO determine order of turns
  determineOrder(GID: number, sub: any){
    if(this.gameManager.get(GID).getGame().state === Gamestate.PREPARATION){
      if (this.gameManager.get(GID).host_sub === sub) {
        this.shuffle(this.gameManager.get(GID).getGame().players);
        this.gameManager.get(GID).getGame().state = Gamestate.INITIAL_PLACE
        this.publish(GID);
      }
      this.gameManager.get(GID).getGame().whos_turn = this.gameManager.get(GID).getGame().players[0]
    }
  }

  dice(id: number, sub: any) {
    if (this.gameManager.get(id).getGame().whos_turn === this.gameManager.get(id).getPlayerDetails(sub).meta){
      this.gameManager.get(id).role_dice();
      //TODO publish new state
      //this.gameManager.get(id)
    }else{
      throw new HttpException('Its not your turn', HttpStatus.BAD_REQUEST);
    }
  }

  nextTurn(id: number, sub: any){
    if (this.gameManager.get(id).getGame().whos_turn === this.gameManager.get(id).getPlayerDetails(sub).meta){
      this.gameManager.get(id).nextTurn();
      //TODO publish new state
    }else{
      throw new HttpException('Its not your turn', HttpStatus.BAD_REQUEST);
    }
  }

  build(id: number, sub: any, structure: Structure, x: number, y: number){
    if (this.gameManager.get(id).getGame().whos_turn === this.gameManager.get(id).getPlayerDetails(sub).meta){
      this.gameManager.get(id).buildStructure(sub, structure, x, y);
    }else{
      throw new HttpException('Its not your turn', HttpStatus.BAD_REQUEST);
    }
  }

  requestTrade(id: number, sub: any, offerRes: BuildingResource[], reqRes: BuildingResource[]){
    if (this.gameManager.get(id).getGame().whos_turn === this.gameManager.get(id).getPlayerDetails(sub).meta){
      // TODO publish trade request
    }else{
      throw new HttpException('Its not your turn', HttpStatus.BAD_REQUEST);
    }
  }

  accepptTrade(id: number, sub: any){
    // TODO trade resource between acceptor and requestor
  }

  publish(GID: number): void{
    console.log(JSON.stringify(this.gameManager.get(GID).getGame()))
    this.client.publish(`${process.env.MQTT_GAME}${GID}`,JSON.stringify(this.gameManager.get(GID).getGame()), {retain: true});
  }

  startGame(GID: number, sub: any, body: any) {
    // Only Hosts are allowed to start the Game
    if (this.gameManager.get(GID).host_sub === sub){
      this.gameManager.get(GID).setPlayerDetails(this.lobbyService.player.get(GID));
      this.lobbyService.player.get(GID).forEach(
        value => this.gameManager.get(GID).getGame().players.push(value.meta)
      )
      this.gameManager.get(GID).getGame().whos_turn = this.gameManager.get(GID).getPlayerDetails(sub).meta;
      this.gameManager.get(GID).getGame().state = Gamestate.PREPARATION;
      // Tell the lobby that the game has started
      this.client.publish(process.env.MQTT_LOBBY.concat(GID.toString()),JSON.stringify({started: true}),{retain: true})
      // Publish the Gamestate
      this.publish(GID);
      return true;
    }else{
      return false;
    }
  }

  shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
