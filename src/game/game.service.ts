import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Gamemanager } from '../Gamemanager';
import { Gameobject } from '../Gameobject';
import { MqttClient } from 'mqtt';
import { Structure } from '../Models/Structure';
import { BuildingResource } from '../Models/BuildingResource';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mqtt = require('mqtt');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv').config();

@Injectable()
export class GameService {
  private games: Map<number, Gamemanager>;
  private gameIdAtomic = 0;
  private client: MqttClient;

  constructor() {
    this.games = new Map<number, Gamemanager>();
    this.client = mqtt.connect(process.env.MQTT_HOST_VM,
      {
        port: process.env.MQTT_PORT,
        username: process.env.MQTT_USER,
        password: process.env.MQTT_PASSWORD,
        protocol: process.env.MQTT_PROTOCOL
      })
    this.client.on('connect', () => {
      console.log('connected to mqtt broker')
      this.client.subscribe(process.env.MQTT_GAME + '#')
    })
    this.client.on('message', (topic, msg) => {
      console.log(`${topic}: ${msg}`);
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

  newGame(rules: any, sub: any): number{
    const gm = new Gamemanager(new Gameobject(this.gameIdAtomic++,rules,null), sub)
    this.games.set(gm.gameid,gm);
    return gm.gameid
  }

  delGame(id: number, sub: any) {
    if (this.games.get(id).host === sub){
      return this.games.delete(id);
    }
    else{
      throw new HttpException('Its not your game, only hosts can delete games', HttpStatus.BAD_REQUEST);
    }
  }

  dice(id: number, sub: any) {
    if (this.games.get(id).getGameobject()._turn_playerid===sub){
      this.games.get(id).role_dice();
      //TODO publish new state
      //this.games.get(id)
    }else{
      throw new HttpException('Its not your turn', HttpStatus.BAD_REQUEST);
    }
  }

  nextTurn(id: number, sub: any){
    if(this.games.get(id).getGameobject()._turn_playerid===sub){
      this.games.get(id).nextTurn();
      //TODO publish new state
    }else{
      throw new HttpException('Its not your turn', HttpStatus.BAD_REQUEST);
    }
  }

  build(id: number, sub: any, structure: Structure, x: number, y: number){
    if(this.games.get(id).getGameobject()._turn_playerid === sub){
      this.games.get(id).buildStructure(sub, structure, x, y);
    }else{
      throw new HttpException('Its not your turn', HttpStatus.BAD_REQUEST);
    }
  }

  requestTrade(id: number, sub: any, offerRes: BuildingResource[], reqRes: BuildingResource[]){
    if(this.games.get(id).getGameobject()._turn_playerid === sub){
      // TODO publish trade request
    }else{
      throw new HttpException('Its not your turn', HttpStatus.BAD_REQUEST);
    }
  }

  accepptTrade(id: number, sub: any){
    // TODO trade resource between acceptor and requestor
  }

  publish(id: number): void{
    this.client.publish(`${process.env.MQTT_GAME}${id}`,JSON.stringify(this.games.get(id).getGameobject().toJSON()), {retain: true});
  }

  startGame(number: number, sub: any) {
    console.log('gamestart requested, tbt')
    //this.games.get(id)
  }
}
