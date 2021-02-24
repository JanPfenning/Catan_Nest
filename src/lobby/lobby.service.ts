import { Injectable } from '@nestjs/common';
import { MqttClient } from 'mqtt';
import {Playerentity} from '../Models/Player';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const crypto = require('crypto');
import { json } from 'express';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mqtt = require('mqtt');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv').config();

@Injectable()
export class LobbyService {

  private client: MqttClient;
  /**
   * @param number: Game ID
   * @param string: SUB of request Player
   * @param Playerentity: actual Playerdata
   */
  player: Map<number, Map<string, Playerentity>>
  /**
   * @param number: GID
   * @param string: password
   */
  lobbyPass: Map<number, string>

  constructor() {
    this.player = new Map<number, Map<string, Playerentity>>();
    this.lobbyPass = new Map<number, string>();
    this.client = mqtt.connect(process.env.MQTT_HOST,//process.env.MQTT_HOST_VM,
      {
        clientId: process.env.MQTT_LOBBY_CLIENT_ID,
        port: process.env.MQTT_PORT,
        username: process.env.MQTT_USER,
        password: process.env.MQTT_PASSWORD,
        protocol: process.env.MQTT_PROTOCOL
      })
    this.client.on('connect', () => {
      console.log('Lobby: connected to mqtt broker')
      //this.client.subscribe(process.env.MQTT_LOBBY + '#')
      //console.log(`listening to ${process.env.MQTT_Lobby}#`)
    })
    this.client.on('message', (topic, msg, packet) => {
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
  //TODO delete lobby by the latest of an hour uptime

  newLobby(id: number, player: {name: string, color: string}, sub: string) {
    this.player.set(id,new Map<string, Playerentity>());
    this.lobbyPass.set(id, this.randPass(5));
    this.updatePlayer(id, player, sub);
  }

  updatePlayer(GID: number, player: {name: string, color: string }, sub: string) {
    this.player.get(GID).set(sub, new Playerentity(player.name,player.color, sub));
    this.publishLobby(GID);
  }

  private randPass(length: number): string {
    let sb = '';
    const characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
      sb += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return sb;
  }

  private publishLobby(id: number) {
    const arr = Array.from(this.player.get(id).values()).map(e => ({name: e.name,color: e.colour}));
    //console.log(JSON.stringify(arr)+"\nto "+process.env.MQTT_LOBBY.concat(id.toString()));
    this.client.publish(process.env.MQTT_LOBBY.concat(id.toString()),JSON.stringify(arr),{retain: true});
  }

  getPass(id: number, user: any): string {
    return this.lobbyPass.get(id);
  }
}
