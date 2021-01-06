import { Injectable } from '@nestjs/common';
import { MqttClient } from 'mqtt';
import {Playerentity} from '../Models/Player';
import { json } from 'express';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mqtt = require('mqtt');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv').config();

@Injectable()
export class LobbyService {

  private client: MqttClient;

  player: Map<number, Map<string, Playerentity>>
  lobbyPass: Map<number, string>

  constructor() {
    this.player = new Map<number, Map<string, Playerentity>>();
    this.lobbyPass = new Map<number, string>();
    this.client = mqtt.connect(process.env.MQTT_HOST_VM,
      {
        port: process.env.MQTT_PORT,
        username: process.env.MQTT_USER,
        password: process.env.MQTT_PASSWORD,
        protocol: process.env.MQTT_PROTOCOL
      })
    this.client.on('connect', () => {
      console.log('connected to mqtt broker')
      this.client.subscribe(process.env.MQTT_LOBBY + '#')
    })
    this.client.on('message', (topic, msg, packet) => {
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

  newLobby(id: number, player: {name: string, color: string }, user: any) {
    this.player.set(id,new Map<string, Playerentity>());
    this.lobbyPass.set(id, this.randPass(5));
    this.updatePlayer(id,player, user);
  }

  updatePlayer(id: number, player: {name: string, color: string }, user: any) {
    this.player.get(id).set(user,new Playerentity(player.name,player.color,user));
    this.publishLobby(id);
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
    const arr = Array.from(this.player.get(id).values()).map(e => ({name: e.name,color: e.color}));
    this.client.publish(process.env.MQTT_LOBBY.concat(id.toString()),JSON.stringify(arr),{retain: true});
  }

  getPass(id: number, user: any): string {
    return this.lobbyPass.get(id);
  }
}
