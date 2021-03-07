import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Gamemanager } from '../Gamemanager';
import { MqttClient } from 'mqtt';
import { Structure } from '../Models/Structure';
import { Game } from './Game';
import { LobbyService } from '../lobby/lobby.service';
import { Gamestate } from '../Models/Gamestate';
import { HarbourType } from '../Models/HarbourType';
import { Resource } from '../Models/Resource';
import { edgeToAdjVertices } from '../translator';
import { Edge } from '../Models/Edge';
import { DevelopmentCardType } from '../Models/DevelopmentCard';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mqtt = require('mqtt');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv').config();

// TODO Longest Road
// TODO Largest Army
// TODO Gold resource selection
// TODO 7-Turn
// TODO Use Development Cards
// TODO additional VicPoint for conquering new island (With structuring as adjacent matrix and depth-search)
// TODO reposition a ship every turn if its not blocked front and back
@Injectable()
export class GameService {
  static BANK_PID = 1;
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
        protocol: process.env.MQTT_PROTOCOL,
      });
    this.client.on('connect', () => {
      console.log('Game: connected to mqtt broker');
      //this.client.subscribe(process.env.MQTT_GAME + '#')
      //console.log(`listening to ${process.env.MQTT_GAME}#`)
    });
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

  newGame(meta_data: any, sub: string): number {
    //console.log(meta_data)
    const gm = new Gamemanager(
      new Game(
        this.gameIdAtomic++,
        meta_data.pointsToWin,
        meta_data.hexes,
        meta_data.harbours,
        meta_data.max_res,
        meta_data.max_dev)
      , sub);
    this.gameManager.set(gm.GID, gm);
    return gm.GID;
  }

  /**
   * @param GID GameID which corresponding Game is to be deleted
   * @param sub Issuer
   */
  delGame(GID: number, sub: any) {
    //Only hosts are allowed to delete games via request
    if (this.gameManager.get(GID).host_sub === sub) {
      return this.gameManager.delete(GID);
    } else {
      throw new HttpException('Its not your game, only hosts can delete games', HttpStatus.BAD_REQUEST);
    }
  }

  determineOrder(GID: number, sub: any) {
    if (this.gameManager.get(GID).getGame().state === Gamestate.PREPARATION) {
      if (this.gameManager.get(GID).host_sub === sub) {
        GameService.shuffle(this.gameManager.get(GID).getGame().players);
        this.gameManager.get(GID).determineNextPlayer();
        this.gameManager.get(GID).getGame().state = Gamestate.INITIAL_PLACE_FORWARD;
        this.publish(GID);
      }
    }
  }

  dice(id: number, sub: any) {
    const gm = this.gameManager.get(id);
    if (gm.getGame().whos_turn === gm.getPlayerDetails(sub).meta) {
      gm.role_dice();
      gm.nextPhase();
      this.publish(id);
    } else {
      throw new HttpException('Its not your turn', HttpStatus.BAD_REQUEST);
    }
  }

  // TODO dont allow next turn, if not House and Ship/Street is placed while Gamestate INITIAL_PLACE_*
  nextTurn(id: number, sub: any) {
    if (this.gameManager.get(id).getGame().whos_turn === this.gameManager.get(id).getPlayerDetails(sub).meta) {
      if (this.gameManager.get(id).getGame().state === Gamestate.INITIAL_PLACE_FORWARD || this.gameManager.get(id).getGame().state === Gamestate.INITIAL_PLACE_BACKWARD) {
        const before = this.gameManager.get(id).getGame().state;
        this.gameManager.get(id).nextPhase();
        if (before === Gamestate.INITIAL_PLACE_BACKWARD && this.gameManager.get(id).getGame().state === Gamestate.DICE) {
          this.gameManager.get(id).getGame().turn = -1;
        }
      }
      if (this.gameManager.get(id).getGame().state === Gamestate.INITIAL_PLACE_FORWARD) {
        this.gameManager.get(id).nextTurn();
      } else if (this.gameManager.get(id).getGame().state === Gamestate.INITIAL_PLACE_BACKWARD) {
        this.gameManager.get(id).nextTurn();
        this.gameManager.get(id).determinePrevPlayer();
      } else {
        if (this.gameManager.get(id).getGame().turn === -1) {
          this.gameManager.get(id).nextTurn();
          this.gameManager.get(id).getGame().state = Gamestate.DICE;
        } else {
          this.gameManager.get(id).nextTurn();
        }
      }
      this.publish(id);
    } else {
      throw new HttpException('Its not your turn', HttpStatus.BAD_REQUEST);
    }
  }

  build(GID: number, sub: any, structure: Structure, x: number, y: number) {
    if (this.gameManager.get(GID).getGame().whos_turn === this.gameManager.get(GID).getPlayerDetails(sub).meta) {
      this.gameManager.get(GID).buildStructure(sub, structure, x, y);
      this.publish(GID);
    } else {
      throw new HttpException('Its not your turn', HttpStatus.BAD_REQUEST);
    }
  }

  requestTrade(id: number, sub: any, { brick, lumber, wool, grain, ore }) {
    const me = this.gameManager.get(id).getPlayerDetails(sub);
    const game = this.gameManager.get(id).getGame();
    if (game.whos_turn === this.gameManager.get(id).getPlayerDetails(sub).meta &&
      game.state === Gamestate.TURN) {
      if (me.resources.brick + brick >= 0 && me.resources.lumber + lumber >= 0 && me.resources.wool + wool >= 0 &&
        me.resources.grain + grain >= 0 && me.resources.ore + ore >= 0) {
        game.tradeOffer.brick = brick;
        game.tradeOffer.lumber = lumber;
        game.tradeOffer.wool = wool;
        game.tradeOffer.grain = grain;
        game.tradeOffer.ore = ore;
        game.tradeOffer.issuer = me.meta.PID;
        game.tradeOffer.possiblePartners = [];
        game.state = Gamestate.AWAIT_TRADE;
        // check if bank is applicable partner and add it to array if so
        let bankApplicable = true;
        const myHarbours = new Set<number | Resource>();
        this.gameManager.get(id).getGame().harbours.forEach(harbour => {
          const dummyEdge = new Edge(harbour.x, harbour.y);
          const vertices = edgeToAdjVertices(dummyEdge);
          if (this.gameManager.get(id).getGame().vertices[vertices[1][0]][vertices[1][1]].owner_id === me.meta.PID ||
            this.gameManager.get(id).getGame().vertices[vertices[0][0]][vertices[0][1]].owner_id === me.meta.PID) {
            if (+harbour.resource === +HarbourType.Brick) {
              myHarbours.add(Resource.Brick);
            }
            if (+harbour.resource === +HarbourType.Lumber) {
              myHarbours.add(Resource.Lumber);
            }
            if (+harbour.resource === +HarbourType.Wool) {
              myHarbours.add(Resource.Wool);
            }
            if (+harbour.resource === +HarbourType.Grain) {
              myHarbours.add(Resource.Grain);
            }
            if (+harbour.resource === +HarbourType.Ore) {
              myHarbours.add(Resource.Ore);
            }
            if (+harbour.resource === +HarbourType.TTO) {
              myHarbours.add(0);
            }
          }
        });
        let receive = 0;
        if (game.tradeOffer.brick < 0) {
          if (myHarbours.has(Resource.Brick) && game.tradeOffer.brick % 2 === 0) {
            receive += (-game.tradeOffer.brick / 2);
          } else if (myHarbours.has(0) && game.tradeOffer.brick % 3 === 0) {
            receive += (-game.tradeOffer.brick / 3);
          } else if (game.tradeOffer.brick % 4 === 0) {
            receive += (-game.tradeOffer.brick / 4);
          } else {
            bankApplicable = false;
          }
        }
        if (game.tradeOffer.lumber < 0) {
          if (myHarbours.has(Resource.Lumber) && game.tradeOffer.lumber % 2 === 0) {
            receive += (-game.tradeOffer.lumber / 2);
          } else if (myHarbours.has(0) && game.tradeOffer.lumber % 3 === 0) {
            receive += (-game.tradeOffer.lumber / 3);
          } else if (game.tradeOffer.lumber % 4 === 0) {
            receive += (-game.tradeOffer.lumber / 4);
          } else {
            bankApplicable = false;
          }
        }
        if (game.tradeOffer.wool < 0) {
          if (myHarbours.has(Resource.Wool) && game.tradeOffer.wool % 2 === 0) {
            receive += (-game.tradeOffer.wool / 2);
          } else if (myHarbours.has(0) && game.tradeOffer.wool % 3 === 0) {
            receive += (-game.tradeOffer.wool / 3);
          } else if (game.tradeOffer.wool % 4 === 0) {
            receive += (-game.tradeOffer.wool / 4);
          } else {
            bankApplicable = false;
          }
        }
        if (game.tradeOffer.grain < 0) {
          if (myHarbours.has(Resource.Grain) && game.tradeOffer.grain % 2 === 0) {
            receive += (-game.tradeOffer.grain / 2);
          } else if (myHarbours.has(0) && game.tradeOffer.grain % 3 === 0) {
            receive += (-game.tradeOffer.grain / 3);
          } else if (game.tradeOffer.grain % 4 === 0) {
            receive += (-game.tradeOffer.grain / 4);
          } else {
            bankApplicable = false;
          }
        }
        if (game.tradeOffer.ore < 0) {
          if (myHarbours.has(Resource.Ore) && game.tradeOffer.ore % 2 === 0) {
            receive += (-game.tradeOffer.ore / 2);
          } else if (myHarbours.has(0) && game.tradeOffer.ore % 3 === 0) {
            receive += (-game.tradeOffer.ore / 3);
          } else if (game.tradeOffer.ore % 4 === 0) {
            receive += (-game.tradeOffer.ore / 4);
          } else {
            bankApplicable = false;
          }
        }
        if (game.tradeOffer.brick > 0) {
          receive -= game.tradeOffer.brick;
        }
        if (game.tradeOffer.lumber > 0) {
          receive -= game.tradeOffer.lumber;
        }
        if (game.tradeOffer.wool > 0) {
          receive -= game.tradeOffer.wool;
        }
        if (game.tradeOffer.grain > 0) {
          receive -= game.tradeOffer.grain;
        }
        if (game.tradeOffer.ore > 0) {
          receive -= game.tradeOffer.ore;
        }
        if (receive !== 0) {
          bankApplicable = false;
        }
        console.log(`Trading with the bank is ${bankApplicable ? '' : 'not '}applicable`);
        if (bankApplicable && game.bank_res.brick - game.tradeOffer.brick >= 0 && game.bank_res.lumber - game.tradeOffer.lumber >= 0 && game.bank_res.wool - game.tradeOffer.wool >= 0 &&
          game.bank_res.grain - game.tradeOffer.grain >= 0 && game.bank_res.ore - game.tradeOffer.ore >= 0) {
          this.gameManager.get(id).getGame().tradeOffer.possiblePartners.push(GameService.BANK_PID);
        }
        this.publish(id);
      } else {
        throw new HttpException('Insufficient resources to give', HttpStatus.BAD_REQUEST);
      }
    } else {
      throw new HttpException('Its not your turn', HttpStatus.BAD_REQUEST);
    }
  }

  accepptTrade(GID: number, sub: any) {
    const myPID = this.gameManager.get(GID).getPlayerDetails(sub).meta.PID;
    const me = this.gameManager.get(GID).getPlayerDetails(sub);
    const game = this.gameManager.get(GID).getGame();
    if (this.gameManager.get(GID).getGame().tradeOffer.possiblePartners.indexOf(myPID) === -1) {
      if (this.gameManager.get(GID).getGame().state === Gamestate.AWAIT_TRADE) {
        if (me.resources.brick - game.tradeOffer.brick >= 0 && me.resources.lumber - game.tradeOffer.lumber >= 0 && me.resources.wool - game.tradeOffer.wool >= 0 &&
          me.resources.grain - game.tradeOffer.grain >= 0 && me.resources.ore - game.tradeOffer.ore >= 0) {
          this.gameManager.get(GID).getGame().tradeOffer.possiblePartners.push(myPID);
          this.publish(GID);
        } else {
          throw new HttpException('You cant afford this trade to be done with you', HttpStatus.BAD_REQUEST);
        }
      } else {
        throw new HttpException('No Trade is awaiting responses', HttpStatus.BAD_REQUEST);
      }
    } else {
      throw new HttpException('You already accepted the trade offer', HttpStatus.BAD_REQUEST);
    }
  }

  executeTrade(GID: number, sub: any, partnerID: number) {
    const trade = this.gameManager.get(GID).getGame().tradeOffer;
    let partnerSub = '';
    trade.possiblePartners.forEach(partner => {
      if (partner === partnerID) {
        if (partner === 1) {
          partnerSub = 'Bank';
        } else {
          this.gameManager.get(GID).player_details.forEach(value => {
            if (value.meta.PID === partnerID) {
              partnerSub = value.sub;
            }
          });
        }
      }
    });
    if (partnerSub === '') {
      throw new HttpException('Partner did not accept to trade with you', HttpStatus.BAD_REQUEST);
    }
    if (this.gameManager.get(GID).getPlayerDetails(sub).meta.PID === trade.issuer) {
      this.gameManager.get(GID).getPlayerDetails(sub).addResource({
        brick: trade.brick,
        lumber: trade.lumber,
        wool: trade.wool,
        grain: trade.grain,
        ore: trade.ore,
      });
      if (partnerSub === 'Bank') {
        this.gameManager.get(GID).getGame().bank_res.brick -= trade.brick;
        this.gameManager.get(GID).getGame().bank_res.lumber -= trade.lumber;
        this.gameManager.get(GID).getGame().bank_res.wool -= trade.wool;
        this.gameManager.get(GID).getGame().bank_res.grain -= trade.grain;
        this.gameManager.get(GID).getGame().bank_res.ore -= trade.ore;
      } else {
        this.gameManager.get(GID).getPlayerDetails(partnerSub).addResource({
          brick: -trade.brick,
          lumber: -trade.lumber,
          wool: -trade.wool,
          grain: -trade.grain,
          ore: -trade.ore,
        });
      }
      this.gameManager.get(GID).getGame().state = Gamestate.TURN;
      this.gameManager.get(GID).getGame().tradeOffer = {
        brick: 0,
        lumber: 0,
        wool: 0,
        grain: 0,
        ore: 0,
        issuer: 0,
        possiblePartners: [],
      };
      this.publish(GID);
    } else {
      throw new HttpException('You are not the issuer of the trade, hence you cant execute it', HttpStatus.BAD_REQUEST);
    }
  }

  publish(GID: number): void {
    //console.log(JSON.stringify(this.gameManager.get(GID).getGame()))
    this.client.publish(`${process.env.MQTT_GAME}${GID}`, JSON.stringify(this.gameManager.get(GID).getGame()), { retain: true });
  }

  startGame(GID: number, sub: any, body: any) {
    // Only Hosts are allowed to start the Game
    if (this.gameManager.get(GID).host_sub === sub) {
      this.gameManager.get(GID).setPlayerDetails(this.lobbyService.player.get(GID));
      this.lobbyService.player.get(GID).forEach(
        value => this.gameManager.get(GID).getGame().players.push(value.meta),
      );
      this.gameManager.get(GID).getGame().whos_turn = this.gameManager.get(GID).getPlayerDetails(sub).meta;
      this.gameManager.get(GID).getGame().state = Gamestate.PREPARATION;
      // Tell the lobby that the game has started
      this.client.publish(process.env.MQTT_LOBBY.concat(GID.toString()), JSON.stringify({ started: true }), { retain: true });
      // Publish the Gamestate
      this.publish(GID);
      return true;
    } else {
      return false;
    }
  }

  static shuffle(a) {
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
    const trade = this.gameManager.get(GID).getGame().tradeOffer;
    if (this.gameManager.get(GID).getPlayerDetails(sub).meta.PID === trade.issuer) {
      this.gameManager.get(GID).getGame().state = Gamestate.TURN;
      this.gameManager.get(GID).getGame().tradeOffer = {
        brick: 0,
        lumber: 0,
        wool: 0,
        grain: 0,
        ore: 0,
        issuer: 0,
        possiblePartners: [],
      };
      this.publish(GID);
    } else {
      throw new HttpException('You are not the issuer of the trade, hence you cant cancel it', HttpStatus.BAD_REQUEST);
    }
  }

  buyDev(GID: number, sub: any) {
    if (this.gameManager.get(GID).getGame().whos_turn.PID === this.gameManager.get(GID).getPlayerDetails(sub).meta.PID) {
      if (this.gameManager.get(GID).getGame().cur_dev >= 1) {
        if (this.gameManager.get(GID).getPlayerDetails(sub).addResource({
          brick: 0,
          lumber: 0,
          wool: -1,
          grain: -1,
          ore: -1,
        })) {
          const card = this.gameManager.get(GID).developmentCards.pop();
          card.bought = this.gameManager.get(GID).getGame().turn;
          this.gameManager.get(GID).player_details.get(sub).development_cards.push(card);
          this.gameManager.get(GID).getGame().cur_dev--;
          this.publish(GID);
        } else {
          throw new HttpException('Insufficient resources to buy a development card', HttpStatus.BAD_REQUEST);
        }
      } else {
        throw new HttpException('No development cards left', HttpStatus.BAD_REQUEST);
      }
    } else {
      throw new HttpException('Its not your turn', HttpStatus.BAD_REQUEST);
    }
  }

  useRoadbuilding(GID: number, sub: any, payload: { structure1: Edge, structure2: Edge }): void {
    if (this.gameManager.get(GID).getGame().whos_turn.PID === this.gameManager.get(GID).getPlayerDetails(sub).meta.PID) {
      console.log('Use Roadbuilding Devcard')
      let card = null;
      this.gameManager.get(GID).getPlayerDetails(sub).development_cards.forEach(value => {
        if (value.type === DevelopmentCardType.Roadbuilding && this.gameManager.get(GID).getGame().turn > value.bought + 1 && !value.used) {
          card = value;
        }
      });
      if (card !== null) {
        // TODO check if structrues are applicable
        if (+payload.structure1.building === +Structure.Road) {
          this.gameManager.get(GID).getPlayerDetails(sub).addResource({
            brick: 1,
            lumber: 1,
            wool: 0,
            grain: 0,
            ore: 0,
          });
        } else {
          this.gameManager.get(GID).getPlayerDetails(sub).addResource({
            brick: 0,
            lumber: 1,
            wool: 1,
            grain: 0,
            ore: 0,
          });
        }
        if (+payload.structure2.building === +Structure.Road) {
          this.gameManager.get(GID).getPlayerDetails(sub).addResource({
            brick: 1,
            lumber: 1,
            wool: 0,
            grain: 0,
            ore: 0,
          });
        } else {
          this.gameManager.get(GID).getPlayerDetails(sub).addResource({
            brick: 0,
            lumber: 1,
            wool: 1,
            grain: 0,
            ore: 0,
          });
        }
        console.log(payload);
        this.gameManager.get(GID).buildStructure(sub, payload.structure1.building, payload.structure1.x, payload.structure1.y);
        this.gameManager.get(GID).buildStructure(sub, payload.structure2.building, payload.structure2.x, payload.structure2.y);
        card.used = true;
        this.publish(GID);
      } else {
        throw new HttpException('You dont own a Roadbuilding card that is applicable', HttpStatus.BAD_REQUEST);
      }
    } else {
      throw new HttpException('Its not your turn', HttpStatus.BAD_REQUEST);
    }
  }

  useYOP(GID: number, sub: any, payload: { resource1: Resource; resource2: Resource}): void {
    if (this.gameManager.get(GID).getGame().whos_turn.PID === this.gameManager.get(GID).getPlayerDetails(sub).meta.PID) {
      let card = null;
      this.gameManager.get(GID).getPlayerDetails(sub).development_cards.forEach(value => {
        if (value.type === DevelopmentCardType.YearOfPlenty && this.gameManager.get(GID).getGame().turn > value.bought + 1 && !value.used) {
          card = value;
        }
      });
      if (card !== null) {
        const bankResBackup = JSON.parse(JSON.stringify(this.gameManager.get(GID).getGame().bank_res));
        const subResBackup = JSON.parse(JSON.stringify(this.gameManager.get(GID).getPlayerDetails(sub).resources));
        let res1 = true;
        let res2 = true;
        if (+payload.resource1 === +Resource.Brick && payload.resource1) {
          if (this.gameManager.get(GID).getGame().bank_res.brick - 1 >= 0) {
            this.gameManager.get(GID).getGame().bank_res.brick -= 1;
            this.gameManager.get(GID).getPlayerDetails(sub).resources.brick += 1;
          }
          else{
            res1 = false
          }
        }
        if (+payload.resource1 === +Resource.Lumber) {
          if (this.gameManager.get(GID).getGame().bank_res.lumber - 1 >= 0) {
            this.gameManager.get(GID).getGame().bank_res.lumber -= 1;
            this.gameManager.get(GID).getPlayerDetails(sub).resources.lumber += 1;
          }
          else{
            res1 = false
          }
        }
        if (+payload.resource1 === +Resource.Wool) {
          if (this.gameManager.get(GID).getGame().bank_res.wool - 1 >= 0) {
            this.gameManager.get(GID).getGame().bank_res.wool -= 1;
            this.gameManager.get(GID).getPlayerDetails(sub).resources.wool += 1;
          }
          else{
            res1 = false
          }
        }
        if (+payload.resource1 === +Resource.Grain) {
          if (this.gameManager.get(GID).getGame().bank_res.grain - 1 >= 0) {
            this.gameManager.get(GID).getGame().bank_res.grain -= 1;
            this.gameManager.get(GID).getPlayerDetails(sub).resources.grain += 1;
          }
          else{
            res1 = false
          }
        }
        if (+payload.resource1 === +Resource.Ore) {
          if (this.gameManager.get(GID).getGame().bank_res.ore - 1 >= 0) {
            this.gameManager.get(GID).getGame().bank_res.ore -= 1;
            this.gameManager.get(GID).getPlayerDetails(sub).resources.ore += 1;
          }
          else{
            res1 = false
          }
        }
        if (+payload.resource2 === +Resource.Brick) {
          if (this.gameManager.get(GID).getGame().bank_res.brick - 1 >= 0) {
            this.gameManager.get(GID).getGame().bank_res.brick -= 1;
            this.gameManager.get(GID).getPlayerDetails(sub).resources.brick += 1;
          }
          else{
            res2 = false
          }
        }
        if (+payload.resource2 === +Resource.Lumber) {
          if (this.gameManager.get(GID).getGame().bank_res.lumber - 1 >= 0) {
            this.gameManager.get(GID).getGame().bank_res.lumber -= 1;
            this.gameManager.get(GID).getPlayerDetails(sub).resources.lumber += 1;
          }
          else{
            res2 = false
          }
        }
        if (+payload.resource2 === +Resource.Wool) {
          if (this.gameManager.get(GID).getGame().bank_res.wool - 1 >= 0) {
            this.gameManager.get(GID).getGame().bank_res.wool -= 1;
            this.gameManager.get(GID).getPlayerDetails(sub).resources.wool += 1;
          }
          else{
            res2 = false
          }
        }
        if (+payload.resource2 === +Resource.Grain) {
          if (this.gameManager.get(GID).getGame().bank_res.grain - 1 >= 0) {
            this.gameManager.get(GID).getGame().bank_res.grain -= 1;
            this.gameManager.get(GID).getPlayerDetails(sub).resources.grain += 1;
          }
          else{
            res2 = false
          }
        }
        if (+payload.resource2 === +Resource.Ore) {
          if (this.gameManager.get(GID).getGame().bank_res.ore - 1 >= 0) {
            this.gameManager.get(GID).getGame().bank_res.ore -= 1;
            this.gameManager.get(GID).getPlayerDetails(sub).resources.ore += 1;
          }
          else{
            res2 = false
          }
        }
        if (! (res1 && res2)){
          this.gameManager.get(GID).getGame().bank_res = bankResBackup;
          this.gameManager.get(GID).getPlayerDetails(sub).resources = subResBackup;
        }
        card.used = true;
        this.publish(GID);
      } else {
        throw new HttpException('You dont own a YearOfPleanty-Card that is usable', HttpStatus.BAD_REQUEST);
      }
    } else {
      throw new HttpException('Its not your turn', HttpStatus.BAD_REQUEST);
    }
  }

  useMonopoly(GID: number, sub: any, payload: { resource }): void {
    if (this.gameManager.get(GID).getGame().whos_turn.PID === this.gameManager.get(GID).getPlayerDetails(sub).meta.PID) {
      let card = null;
      this.gameManager.get(GID).getPlayerDetails(sub).development_cards.forEach(value => {
        if (value.type === DevelopmentCardType.Monopoly && this.gameManager.get(GID).getGame().turn > value.bought + 1 && !value.used) {
          card = value;
        }
      });
      if (card !== null) {
        Array.from(this.gameManager.get(GID).player_details.values()).forEach(value => {
          if (+payload.resource === Resource.Brick) {
            this.gameManager.get(GID).getPlayerDetails(sub).resources.brick += value.resources.brick;
            value.resources.brick = 0;
          }
          if (+payload.resource === Resource.Lumber) {
            this.gameManager.get(GID).getPlayerDetails(sub).resources.lumber += value.resources.lumber;
            value.resources.lumber = 0;
          }
          if (+payload.resource === Resource.Wool) {
            this.gameManager.get(GID).getPlayerDetails(sub).resources.wool += value.resources.wool;
            value.resources.wool = 0;
          }
          if (+payload.resource === Resource.Grain) {
            this.gameManager.get(GID).getPlayerDetails(sub).resources.grain += value.resources.grain;
            value.resources.grain = 0;
          }
          if (+payload.resource === Resource.Ore) {
            this.gameManager.get(GID).getPlayerDetails(sub).resources.ore += value.resources.ore;
            value.resources.ore = 0;
          }
        });
        card.used = true;
        this.publish(GID);
      } else {
        throw new HttpException('You dont own a Monopolycard that is applicable', HttpStatus.BAD_REQUEST);
      }
    } else {
      throw new HttpException('Its not your turn', HttpStatus.BAD_REQUEST);
    }
  }

  useKnight(GID: number, sub: any, payload: { hex }) {
    if (this.gameManager.get(GID).getGame().whos_turn.PID === this.gameManager.get(GID).getPlayerDetails(sub).meta.PID) {
      let card = null;
      this.gameManager.get(GID).getPlayerDetails(sub).development_cards.forEach(value => {
        if (value.type === DevelopmentCardType.Knight && this.gameManager.get(GID).getGame().turn > value.bought + 1 && !value.used) {
          card = value;
        }
      });
      if (card !== null) {
        // TODO implement
        this.publish(GID);
      } else {
        throw new HttpException('You dont own a Knightcard that is applicable', HttpStatus.BAD_REQUEST);
      }
    } else {
      throw new HttpException('Its not your turn', HttpStatus.BAD_REQUEST);
    }
  }
}
