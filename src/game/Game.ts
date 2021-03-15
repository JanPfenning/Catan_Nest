import { Edge } from '../Models/Edge';
import { Vertex } from '../Models/Vertex';
import { Hex } from '../Models/Hex';
import { Meta, Playerentity } from '../Models/Player';
import { Gamestate } from '../Models/Gamestate';
import {Resource} from '../Models/Resource';
import {Harbour} from '../Models/Harbour';
import { DevelopmentCard } from '../Models/DevelopmentCard';
import { max } from 'rxjs/operators';

export class Game{
  GID: number
  state: Gamestate
  pointsToWin: number
  hexes: Hex[][]
  edges: Edge[][]
  vertices: Vertex[][]
  harbours: Harbour[]
  players: Meta[] = [];
  bank_res: {brick: number, lumber: number, wool: number, grain: number, ore: number}
  max_res: {brick: number, lumber: number, wool: number, grain: number, ore: number}
  cur_dev: number
  max_dev: {knight: number, victorypoint: number, monopoly: number, yop: number, roadbuilding: number}
  devPlayed: boolean
  shipReplaced: boolean
  turn: number
  whos_turn: Meta
  roll_history: number[]
  tradeOffer: {brick, lumber, wool, grain, ore, issuer, possiblePartners};
  possible_victims: number[];
  taxEvaders: number[];
  winner: string|null;
  longestRoadOwner: number;
  largestArmyOwner: null;
  goldReceive: number[] = [];

  constructor(GID: number, pointsToWin: number, hexes: Hex[][], harbours: Harbour[],
              max_res: { brick: number; lumber: number; wool: number; grain: number; ore: number }, max_dev: {knight: number, victorypoint: number, monopoly: number, yop: number, roadbuilding: number}) {
    this.GID = GID;
    this.pointsToWin = pointsToWin;
    this.harbours = harbours;
    this.max_res = max_res;
    this.max_dev = max_dev;
    this.hexes = hexes;
    this.harbours = harbours;

    this.state = Gamestate.LOBBY;
    const height = hexes.length
    const width = hexes[0].length
    this.edges = []
    for(let i = 0; i < (4 * (width + 1) + 2); i++){
      this.edges[i]=[]
      for(let j = 0; j < (2 * (height + 1)); j++){
        this.edges[i][j] = new Edge(i,j)
      }
    }
    this.vertices = []
    for(let i = 0; i <= (2 * width + 1); i++){
      this.vertices[i]=[]
      for(let j = 0; j <= (2 * height + 1); j++){
        this.vertices[i][j] = new Vertex(i,j)
      }
    }
    this.longestRoadOwner = null;
    this.largestArmyOwner = null;
    this.bank_res = JSON.parse(JSON.stringify(this.max_res));
    this.cur_dev = (+max_dev.knight) + (+max_dev.monopoly) + (+max_dev.yop) + (+max_dev.roadbuilding) + (+max_dev.victorypoint);
    this.devPlayed = false;
    this.taxEvaders = [];
    this.possible_victims = [];
    this.goldReceive = [];
    this.winner = null;
    this.turn = 0;
    this.shipReplaced = false;
    this.roll_history = [];
    this.tradeOffer = {brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0, issuer: 0, possiblePartners: []};
  }
}
