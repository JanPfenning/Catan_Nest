import { Edge } from '../Models/Edge';
import { Vertex } from '../Models/Vertex';
import { Hex } from '../Models/Hex';
import { Playerentity } from '../Models/Player';

export class Game{
  GID: number
  playerMetadata: Playerentity[]
  pointsToWin: number
  hexes: Hex[][]
  edges: Edge[][]
  vertices: Vertex[][]
  harbours: Harbour[]
  bank_res: {brick: number, lumber: number, wool: number, grain: number, ore: number}
  max_res: {brick: number, lumber: number, wool: number, grain: number, ore: number}
  cur_dev: number
  max_dev: number
  turn: number
  players_turn: Playerentity
  roll_history: number[]

  constructor(GID: number, pointsToWin: number, hexes: Hex[][], harbours: Harbour[],
              max_res: { brick: number; lumber: number; wool: number; grain: number; ore: number }, max_dev: number) {
    this.GID = GID;
    this.pointsToWin = pointsToWin;
    this.harbours = harbours;
    this.max_res = max_res;
    this.max_dev = max_dev;
    this.hexes = hexes;
    this.harbours = harbours;

    const height = hexes.length
    const width = hexes[0].length
    this.edges = []
    for(let i = 0; i < (2 * width + 2); i++){
      this.edges[i]=[]
      for(let j = 0; j < (2 * height); j++){
        this.edges[i][j] = new Edge(i,j)
      }
    }
    this.vertices = []
    for(let i = 0; i < (2 * width + 1); i++){
      this.vertices[i]=[]
      for(let j = 0; j < (2 * height + 1); j++){
        this.vertices[i][j] = new Vertex(i,j)
      }
    }
    this.bank_res = max_res;
    this.cur_dev = max_dev;
    this.turn = 0;
    this.roll_history = [];
  }

  setPlayers(players: Playerentity[]): void{
    this.playerMetadata = players
    this.players_turn = this.playerMetadata[0];
  }
}
