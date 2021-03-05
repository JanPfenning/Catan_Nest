import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Gamemanager } from '../Gamemanager';
import { MqttClient } from 'mqtt';
import { Structure } from '../Models/Structure';
import { Game } from './Game';
import { LobbyService } from '../lobby/lobby.service';
import { Gamestate } from '../Models/Gamestate';
import { HarbourType } from '../Models/HarbourType';
import { Resource } from '../Models/Resource';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mqtt = require('mqtt');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv').config();

// TODO Longest Road
// TODO Largest Army
// TODO Trades
// TODO Gold resource selection
// TODO 7-Turn
// TODO Development Cards
// TODO additional VP for conquering new island (With structuring as adjacent matrix and depth-search)
@Injectable()
export class GameService {
  static BANK_PID = 1
  gameManager: Map<number, Gamemanager>;
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

  determineOrder(GID: number, sub: any){
    if(this.gameManager.get(GID).getGame().state === Gamestate.PREPARATION){
      if (this.gameManager.get(GID).host_sub === sub) {
        this.shuffle(this.gameManager.get(GID).getGame().players);
        this.gameManager.get(GID).determineNextPlayer();
        this.gameManager.get(GID).getGame().state = Gamestate.INITIAL_PLACE_FORWARD
        this.publish(GID);
      }
    }
  }

  dice(id: number, sub: any) {
    const gm = this.gameManager.get(id);
    if (gm.getGame().whos_turn === gm.getPlayerDetails(sub).meta){
      gm.role_dice();
      gm.nextPhase();
      this.publish(id);
    }else{
      throw new HttpException('Its not your turn', HttpStatus.BAD_REQUEST);
    }
  }

  nextTurn(id: number, sub: any){
    if (this.gameManager.get(id).getGame().whos_turn === this.gameManager.get(id).getPlayerDetails(sub).meta){
      if (this.gameManager.get(id).getGame().state === Gamestate.INITIAL_PLACE_FORWARD || this.gameManager.get(id).getGame().state === Gamestate.INITIAL_PLACE_BACKWARD){
        const before = this.gameManager.get(id).getGame().state
        this.gameManager.get(id).nextPhase();
        if (before === Gamestate.INITIAL_PLACE_BACKWARD && this.gameManager.get(id).getGame().state === Gamestate.DICE){
          this.gameManager.get(id).getGame().turn = -1;
        }
      }
      if (this.gameManager.get(id).getGame().state === Gamestate.INITIAL_PLACE_FORWARD){
        this.gameManager.get(id).nextTurn();
      }else if (this.gameManager.get(id).getGame().state === Gamestate.INITIAL_PLACE_BACKWARD){
        this.gameManager.get(id).nextTurn();
        this.gameManager.get(id).determinePrevPlayer();
      }else{
        if(this.gameManager.get(id).getGame().turn === -1){
          this.gameManager.get(id).nextTurn();
          this.gameManager.get(id).getGame().state = Gamestate.DICE
        }else{
          this.gameManager.get(id).nextTurn();
        }
      }
      this.publish(id);
    }else{
      throw new HttpException('Its not your turn', HttpStatus.BAD_REQUEST);
    }
  }

  build(GID: number, sub: any, structure: Structure, x: number, y: number){
    if (this.gameManager.get(GID).getGame().whos_turn === this.gameManager.get(GID).getPlayerDetails(sub).meta){
      this.gameManager.get(GID).buildStructure(sub, structure, x, y);
      this.publish(GID);
    }else{
      throw new HttpException('Its not your turn', HttpStatus.BAD_REQUEST);
    }
  }

  requestTrade(id: number, sub: any, {brick, lumber, wool, grain, ore}){
    const me = this.gameManager.get(id).getPlayerDetails(sub);
    const game = this.gameManager.get(id).getGame();
    if (game.whos_turn === this.gameManager.get(id).getPlayerDetails(sub).meta &&
        game.state === Gamestate.TURN){
      if (me.resources.brick + brick >= 0 && me.resources.lumber + lumber >= 0 && me.resources.wool + wool >= 0 &&
          me.resources.grain + grain >= 0 && me.resources.ore + ore >= 0){
        game.tradeOffer.brick = brick
        game.tradeOffer.lumber = lumber
        game.tradeOffer.wool = wool
        game.tradeOffer.grain = grain
        game.tradeOffer.ore = ore
        game.tradeOffer.issuer = me.meta.PID
        game.tradeOffer.possiblePartners = []
        game.state = Gamestate.AWAIT_TRADE;
        // check if bank is applicable partner and add it to array if so
        let bankApplicable = true;
        const myHarbours = new Set()
        this.gameManager.get(id).getGame().harbours.forEach(harbour => {
          if (this.gameManager.get(id).getGame().vertices[harbour.x][harbour.y].owner_id === me.meta.PID){
            if (harbour.resource === HarbourType.Brick){
              myHarbours.add(Resource.Brick);
            }
            if (harbour.resource === HarbourType.Lumber){
              myHarbours.add(Resource.Lumber);
            }
            if (harbour.resource === HarbourType.Wool){
              myHarbours.add(Resource.Wool);
            }
            if (harbour.resource === HarbourType.Grain){
              myHarbours.add(Resource.Grain);
            }
            if (harbour.resource === HarbourType.Ore){
              myHarbours.add(Resource.Ore);
            }
            if (harbour.resource === HarbourType.TTO){
              myHarbours.add(0);
            }
          }
        })
        let receive = 0;
        console.log(game.tradeOffer);
        if (game.tradeOffer.brick < 0){
          if (myHarbours.has(Resource.Brick) && game.tradeOffer.brick % 2 === 0){
            receive += (game.tradeOffer.brick / 2)
          }
          else if (myHarbours.has(0) && game.tradeOffer.brick % 3 === 0){
            receive += (game.tradeOffer.brick / 3)
          }
          else if (game.tradeOffer.brick % 4 === 0){
            receive += (game.tradeOffer.brick / 4)
          }
          else{
            bankApplicable = false;
          }
        }
        if (game.tradeOffer.lumber < 0){
          if (myHarbours.has(Resource.Lumber) && game.tradeOffer.lumber % 2 === 0){
            receive += (game.tradeOffer.lumber / 2)
          }
          else if (myHarbours.has(0) && game.tradeOffer.lumber % 3 === 0){
            receive += (game.tradeOffer.lumber / 3)
          }
          else if (game.tradeOffer.lumber % 4 === 0){
            receive += (game.tradeOffer.lumber / 4)
          }
          else{
            bankApplicable = false;
          }
        }
        if (game.tradeOffer.wool < 0){
          if (myHarbours.has(Resource.Wool) && game.tradeOffer.wool % 2 === 0){
            receive += (game.tradeOffer.wool / 2)
          }
          else if (myHarbours.has(0) && game.tradeOffer.wool % 3 === 0){
            receive += (game.tradeOffer.wool / 3)
          }
          else if (game.tradeOffer.wool % 4 === 0){
            receive += (game.tradeOffer.wool / 4)
          }
          else{
            bankApplicable = false;
          }
        }
        if (game.tradeOffer.grain < 0){
          if (myHarbours.has(Resource.Grain) && game.tradeOffer.grain % 2 === 0){
            receive += (game.tradeOffer.grain / 2)
          }
          else if (myHarbours.has(0) && game.tradeOffer.grain % 3 === 0){
            receive += (game.tradeOffer.grain / 3)
          }
          else if (game.tradeOffer.grain % 4 === 0){
            receive += (game.tradeOffer.grain / 4)
          }
          else{
            bankApplicable = false;
          }
        }
        if (game.tradeOffer.ore < 0){
          if (myHarbours.has(Resource.Ore) && game.tradeOffer.ore % 2 === 0){
            receive += (game.tradeOffer.ore / 2)
          }
          else if (myHarbours.has(0) && game.tradeOffer.ore % 3 === 0){
            receive += (game.tradeOffer.ore / 3)
          }
          else if (game.tradeOffer.ore % 4 === 0){
            receive += (game.tradeOffer.ore / 4)
          }
          else{
            bankApplicable = false;
          }
        }
        if (game.tradeOffer.brick > 0){
          receive -= game.tradeOffer.brick
        }
        if (game.tradeOffer.lumber > 0){
          receive -= game.tradeOffer.lumber
        }
        if (game.tradeOffer.wool > 0){
          receive -= game.tradeOffer.wool
        }
        if (game.tradeOffer.grain > 0){
          receive -= game.tradeOffer.grain
        }
        if (game.tradeOffer.ore > 0){
          receive -= game.tradeOffer.ore
        }
        if (receive !== 0){
          bankApplicable = false;
        }
        // TODO validate bankApplicable as condition (its not correct yet)
        if (bankApplicable && game.bank_res.brick - game.tradeOffer.brick >= 0 && game.bank_res.lumber - game.tradeOffer.lumber >= 0 && game.bank_res.wool - game.tradeOffer.wool >= 0 &&
          game.bank_res.grain - game.tradeOffer.grain >= 0 && game.bank_res.ore - game.tradeOffer.ore >= 0){
          this.gameManager.get(id).getGame().tradeOffer.possiblePartners.push(GameService.BANK_PID)
        }
        this.publish(id)
      }
      else{
        throw new HttpException('Insufficient resources to give', HttpStatus.BAD_REQUEST);
      }
    }
    else{
      throw new HttpException('Its not your turn', HttpStatus.BAD_REQUEST);
    }
  }

  accepptTrade(GID: number, sub: any){
    const myPID = this.gameManager.get(GID).getPlayerDetails(sub).meta.PID
    const me = this.gameManager.get(GID).getPlayerDetails(sub);
    const game = this.gameManager.get(GID).getGame();
    if (this.gameManager.get(GID).getGame().tradeOffer.possiblePartners.indexOf(myPID) === -1) {
      if (this.gameManager.get(GID).getGame().state === Gamestate.AWAIT_TRADE){
        if (me.resources.brick - game.tradeOffer.brick >= 0 && me.resources.lumber - game.tradeOffer.lumber >= 0 && me.resources.wool - game.tradeOffer.wool >= 0 &&
          me.resources.grain - game.tradeOffer.grain >= 0 && me.resources.ore - game.tradeOffer.ore >= 0){
          this.gameManager.get(GID).getGame().tradeOffer.possiblePartners.push(myPID)
          this.publish(GID);
        }
        else{
          throw new HttpException('You cant afford this trade to be done with you', HttpStatus.BAD_REQUEST);
        }
      }
      else{
        throw new HttpException('No Trade is awaiting responses', HttpStatus.BAD_REQUEST);
      }
    }
    else{
      // TODO maybe change it to remove from accepting the trade -> retain acceptance
      throw new HttpException('You already accepted the trade offer', HttpStatus.BAD_REQUEST);
    }
  }

  // TODO validate
  executeTrade(GID: number, sub: any, partnerID: number){
    const trade = this.gameManager.get(GID).getGame().tradeOffer
    let partnerSub = '';
    trade.possiblePartners.forEach(partner => {
      if (partner === partnerID){
        if (partner === 1){
          partnerSub = 'Bank';
        }
        else{
          this.gameManager.get(GID).player_details.forEach(value => {
            if (value.meta.PID === partnerID){
              partnerSub = value.sub;
            }
          })
        }
      }
    })
    if (partnerSub === ''){
      throw new HttpException('Partner did not accept to trade with you', HttpStatus.BAD_REQUEST);
    }
    if (this.gameManager.get(GID).getPlayerDetails(sub).meta.PID === trade.issuer){
      this.gameManager.get(GID).getPlayerDetails(sub).addResource({brick: trade.brick,
                                                                  lumber: trade.lumber,
                                                                  wool: trade.wool,
                                                                  grain: trade.grain,
                                                                  ore: trade.ore});
      if (partnerSub === 'Bank'){
        this.gameManager.get(GID).getGame().bank_res.brick -= trade.brick;
        this.gameManager.get(GID).getGame().bank_res.lumber -= trade.lumber;
        this.gameManager.get(GID).getGame().bank_res.wool -= trade.wool;
        this.gameManager.get(GID).getGame().bank_res.grain -= trade.grain;
        this.gameManager.get(GID).getGame().bank_res.ore -= trade.ore;
      }
      else{
        this.gameManager.get(GID).getPlayerDetails(partnerSub).addResource({brick: -trade.brick,
                                                                            lumber: -trade.lumber,
                                                                            wool: -trade.wool,
                                                                            grain: -trade.grain,
                                                                            ore: -trade.ore});
      }
      this.gameManager.get(GID).getGame().state = Gamestate.TURN;
      this.gameManager.get(GID).getGame().tradeOffer = {brick: 0, lumber: 0 , wool: 0, grain: 0, ore: 0, issuer: 0, possiblePartners: []};
      this.publish(GID);
    }
    else{
      throw new HttpException('You are not the issuer of the trade, hence you cant execute it', HttpStatus.BAD_REQUEST);
    }
  }

  publish(GID: number): void{
    //console.log(JSON.stringify(this.gameManager.get(GID).getGame()))
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

  personalData(GID: number, sub: any) {
    return JSON.stringify(this.gameManager.get(GID).getPlayerDetails(sub));
  }

  cancelTrade(GID: number, sub: any) {
    const trade = this.gameManager.get(GID).getGame().tradeOffer
    if (this.gameManager.get(GID).getPlayerDetails(sub).meta.PID === trade.issuer) {
      this.gameManager.get(GID).getGame().state = Gamestate.TURN;
      this.gameManager.get(GID).getGame().tradeOffer = {
        brick: 0,
        lumber: 0,
        wool: 0,
        grain: 0,
        ore: 0,
        issuer: 0,
        possiblePartners: []
      };
      this.publish(GID);
    }
    else{
      throw new HttpException('You are not the issuer of the trade, hence you cant cancel it', HttpStatus.BAD_REQUEST);
    }
  }
}
