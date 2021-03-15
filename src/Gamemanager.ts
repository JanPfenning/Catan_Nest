import { Structure } from './Models/Structure';
import { Game } from './game/Game';
import { Playerentity } from './Models/Player';
import { Gamestate } from './Models/Gamestate';
import { edgeToAdjEdges, hexToAdjHexes, hexToAdjVertices, vertexToAdjHexes } from './translator';
import { HexType } from './Models/HexType';
import { HttpException, HttpStatus, InternalServerErrorException } from '@nestjs/common';
import { DevelopmentCard, DevelopmentCardType } from './Models/DevelopmentCard';
import { GameService } from './game/game.service';
import { Hex } from './Models/Hex';
import { Vertex } from './Models/Vertex';
import { Edge } from './Models/Edge';

export class Gamemanager {
  private readonly game: Game;
  public player_details: Map<string, Playerentity>;
  public developmentCards: DevelopmentCard[] = []
  readonly GID;
  readonly host_sub: string;

  constructor(game: Game, host_sub: string) {
    this.game = game;
    this.GID = game.GID
    this.host_sub = host_sub;
    this.initDevelopmentCards();
  }

  initDevelopmentCards(): void{
    for (let i = 0; i < +this.game.max_dev.knight; i++) {
      this.developmentCards.push(new DevelopmentCard(DevelopmentCardType.Knight));
    }
    for (let i = 0; i < +this.game.max_dev.victorypoint; i++) {
      this.developmentCards.push(new DevelopmentCard(DevelopmentCardType.Victorypoint));
    }
    for (let i = 0; i < +this.game.max_dev.monopoly; i++) {
      this.developmentCards.push(new DevelopmentCard(DevelopmentCardType.Monopoly));
    }
    for (let i = 0; i < +this.game.max_dev.roadbuilding; i++) {
      this.developmentCards.push(new DevelopmentCard(DevelopmentCardType.Roadbuilding));
    }
    for (let i = 0; i < +this.game.max_dev.yop; i++) {
      this.developmentCards.push(new DevelopmentCard(DevelopmentCardType.YearOfPlenty));
    }
    this.developmentCards = GameService.shuffle(this.developmentCards);
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

  buildStructure(sub: any, structure: Structure, x: number, y: number) {
    if (this.getGame().state === Gamestate.INITIAL_PLACE_FORWARD || this.getGame().state === Gamestate.INITIAL_PLACE_BACKWARD){
      switch (+structure){
        case +Structure.Settlement: {
          const vertex = this.getGame().vertices[x][y];
          vertex.building = structure;
          vertex.owner_id = this.getPlayerDetails(sub).meta.PID;
          vertex.x = x;
          vertex.y = y;
          // Distribute Resources for second settlement
          if (this.getGame().state === Gamestate.INITIAL_PLACE_BACKWARD){
            const adj_hexes = vertexToAdjHexes(vertex);
            for (let i = 0; i <= 2; i++) {
              try {
                const res = this.getGame().hexes[adj_hexes[i][0]][adj_hexes[i][1]];
                switch (+res.type) {
                  case +HexType.Lumber:
                    if (this.addResource({brick: 0, lumber: -1, wool: 0, grain: 0, ore: 0})){
                      this.player_details.get(sub).addResource({brick: 0, lumber: 1, wool: 0, grain: 0, ore: 0});
                    }
                    break;
                  case +HexType.Brick:
                    if (this.addResource({brick: -1, lumber: 0, wool: 0, grain: 0, ore: 0})){
                      this.player_details.get(sub).addResource({brick: 1, lumber: 0, wool: 0, grain: 0, ore: 0});
                    }
                    break;
                  case +HexType.Wool:
                    if (this.addResource({brick: 0, lumber: 0, wool: -1, grain: 0, ore: 0})){
                      this.player_details.get(sub).addResource({brick: 0, lumber: 0, wool: 1, grain: 0, ore: 0});
                    }
                    break;
                  case +HexType.Grain:
                    if (this.addResource({brick: 0, lumber: 0, wool: 0, grain: -1, ore: 0})){
                      this.player_details.get(sub).addResource({brick: 0, lumber: 0, wool: 0, grain: 1, ore: 0});
                    }
                    break;
                  case +HexType.Ore:
                    if (this.addResource({brick: 0, lumber: 0, wool: 0, grain: 0, ore: -1})){
                      this.player_details.get(sub).addResource({brick: 0, lumber: 0, wool: 0, grain: 0, ore: 1});
                    }
                    break;
                  case +HexType.gold:
                    this.getGame().goldReceive.push(this.player_details.get(sub).meta.PID)
                    this.getGame().state = Gamestate.AWAIT_GOLD_ON_PLACE
                    break;
                }
              }catch (e) {
                console.log(e)
              }
            }
          }
          this.getPlayerDetails(sub).meta.structures_left.settlement -= 1;
          this.getPlayerDetails(sub).meta.points += 1;
          break;
        }
        case +Structure.Road: {
          const edge = this.getGame().edges[x][y];
          edge.building = structure;
          edge.owner_id = this.getPlayerDetails(sub).meta.PID;
          edge.x = x;
          edge.y = y;
          this.getPlayerDetails(sub).meta.structures_left.road -= 1;
          break;
        }
        case +Structure.Ship: {
          const edge = this.getGame().edges[x][y];
          edge.building = structure;
          edge.owner_id = this.getPlayerDetails(sub).meta.PID;
          edge.x = x;
          edge.y = y;
          this.getPlayerDetails(sub).meta.structures_left.ship -= 1;
          break;
        }
      }
    }
    else if (this.getGame().state === Gamestate.TURN){
      switch (+structure) {
        // TODO check if position is applicable (prevent faulty calls)
        case +Structure.Road:{
          if (this.getPlayerDetails(sub).addResource({brick: -1, lumber: -1, wool: 0, grain: 0, ore: 0}) &&
              this.getPlayerDetails(sub).meta.structures_left.road >= 1){
            const edge = this.getGame().edges[x][y];
            edge.building = structure;
            edge.owner_id = this.getPlayerDetails(sub).meta.PID;
            edge.x = x;
            edge.y = y;
            this.getPlayerDetails(sub).meta.structures_left.road -= 1;
            this.addResource({brick: 1, lumber: 1, wool: 0, grain: 0, ore: 0})
            this.getCurRoadOfSub(sub);
            this.getLongestRoadOwner()
          }else{
            throw new HttpException('Insufficient resources', HttpStatus.BAD_REQUEST);
          }
          break;
        }
        case +Structure.City:{
          if (this.getPlayerDetails(sub).addResource({brick: 0, lumber: 0, wool: 0, grain: -2, ore: -3}) &&
            this.getPlayerDetails(sub).meta.structures_left.city >= 1){
            const vertex = this.getGame().vertices[x][y];
            vertex.building = structure;
            vertex.owner_id = this.getPlayerDetails(sub).meta.PID;
            vertex.x = x;
            vertex.y = y;
            this.getPlayerDetails(sub).meta.structures_left.city -= 1;
            this.getPlayerDetails(sub).meta.structures_left.settlement += 1;
            this.getPlayerDetails(sub).meta.points += 1;
            this.addResource({brick: 0, lumber: 0, wool: 0, grain: 2, ore: 3})
          }else{
            throw new HttpException('Insufficient resources or no city left', HttpStatus.BAD_REQUEST);
          }
          break;
        }
        case +Structure.Settlement:{
          if (this.getPlayerDetails(sub).addResource({brick: -1, lumber: -1, wool: -1, grain: -1, ore: 0}) &&
            this.getPlayerDetails(sub).meta.structures_left.settlement >= 1){
            // check if placed on a new island
            const known_hexes = new Set<Hex>()
            this.getGame().vertices.forEach(line => {
              line.forEach(vertex => {
                if (vertex.owner_id === this.getPlayerDetails(sub).meta.PID){
                  this.checkNewIsland(vertex).forEach(value => {
                    known_hexes.add(value);
                  })
                }
              })
            })
            const vertex = this.getGame().vertices[x][y];
            vertex.building = structure;
            vertex.owner_id = this.getPlayerDetails(sub).meta.PID;
            vertex.x = x;
            vertex.y = y;
            this.getPlayerDetails(sub).meta.structures_left.settlement -= 1;
            const adj_hexes = vertexToAdjHexes(vertex)
            if (Array.from(known_hexes).indexOf(this.getGame().hexes[adj_hexes[0][0]][adj_hexes[0][1]]) === -1 &&
                Array.from(known_hexes).indexOf(this.getGame().hexes[adj_hexes[1][0]][adj_hexes[1][1]]) === -1){
              // Extra Point for conquering new island
              this.getPlayerDetails(sub).meta.points += 1;
              vertex.additionalPoint = true;
            }
            this.getPlayerDetails(sub).meta.points += 1;
            this.addResource({brick: 1, lumber: 1, wool: 1, grain: 1, ore: 0})
          }else{
            throw new HttpException('Insufficient resources or no settlement left', HttpStatus.BAD_REQUEST);
          }
          break;
        }
        case +Structure.Ship:{
          if (this.getPlayerDetails(sub).addResource({brick: 0, lumber: -1, wool: -1, grain: 0, ore: 0}) &&
            this.getPlayerDetails(sub).meta.structures_left.ship >= 1){
            const edge = this.getGame().edges[x][y];
            edge.building = structure;
            edge.owner_id = this.getPlayerDetails(sub).meta.PID;
            edge.x = x;
            edge.y = y;
            this.getPlayerDetails(sub).meta.structures_left.ship -= 1;
            this.addResource({brick: 0, lumber: 1, wool: 1, grain: 0, ore: 0})
            this.getCurRoadOfSub(sub);
            this.getLongestRoadOwner()
          }else{
            throw new HttpException('Insufficient resources or no ship left', HttpStatus.BAD_REQUEST);
          }
          break;
        }
        case +Structure.DevelopmentCard:{
          throw new HttpException('Use the "buy" route to get a Development Card', HttpStatus.BAD_REQUEST);
        }
      }
    }else{
      throw new HttpException('You cant build when its not Gamestate "Turn"', HttpStatus.BAD_REQUEST);
    }
  }

  distributeEarnings():void{
    this.getGame().hexes.forEach(line => {
      line.forEach(hex => {
       if(hex.nr === this.getGame().roll_history[this.getGame().roll_history.length-1] && hex.knight === false){
         // For each adjacent vertex get owner and give 1 or 2 resources
         const adj_vert = hexToAdjVertices(hex)
         for (let i = 0; i <= 5; i++) {
           const vertex = this.getGame().vertices[adj_vert[i][0]][adj_vert[i][1]]
           const playerDetails = Array.from(this.player_details.values())
           if (vertex.owner_id !== null){
             if (+vertex.building === +Structure.Settlement){
               playerDetails.forEach(value => {
                 if (value.meta.PID === vertex.owner_id){
                   switch (+hex.type) {
                     case +HexType.Lumber:
                       if(this.addResource({brick: 0, lumber: -1, wool: 0, grain: 0, ore: 0})){
                         value.addResource({brick: 0, lumber: 1, wool: 0, grain: 0, ore: 0});
                       }
                       break;
                     case +HexType.Brick:
                       if(this.addResource({brick: -1, lumber: 0, wool: 0, grain: 0, ore: 0})){
                          value.addResource({brick: 1, lumber: 0, wool: 0, grain: 0, ore: 0});
                       }
                       break;
                     case +HexType.Wool:
                       if(this.addResource({brick: 0, lumber: 0, wool: -1, grain: 0, ore: 0})) {
                         value.addResource({ brick: 0, lumber: 0, wool: 1, grain: 0, ore: 0 });
                       }
                       break;
                     case +HexType.Grain:
                       if(this.addResource({brick: 0, lumber: 0, wool: 0, grain: -1, ore: 0})){
                         value.addResource({brick: 0, lumber: 0, wool: 0, grain: 1, ore: 0});
                       }
                       break;
                     case +HexType.Ore:
                       if(this.addResource({brick: 0, lumber: 0, wool: 0, grain: 0, ore: -1})) {
                         value.addResource({ brick: 0, lumber: 0, wool: 0, grain: 0, ore: 1 });
                       }
                       break;
                     case +HexType.gold:
                       this.getGame().goldReceive.push(vertex.owner_id);
                       this.getGame().state = Gamestate.AWAIT_GOLD_SELECTION;
                       break;
                   }
                 }
               })
             }
             else if (+vertex.building === +Structure.City){
               playerDetails.forEach(value => {
                 if (value.meta.PID === vertex.owner_id){
                   switch (+hex.type) {
                     case +HexType.Lumber:
                       if(this.addResource({brick: 0, lumber: -2, wool: 0, grain: 0, ore: 0})){
                         value.addResource({brick: 0, lumber: 2, wool: 0, grain: 0, ore: 0});
                       }
                       break;
                     case +HexType.Brick:
                       if(this.addResource({brick: -2, lumber: 0, wool: 0, grain: 0, ore: 0})){
                         value.addResource({brick: 2, lumber: 0, wool: 0, grain: 0, ore: 0});
                       }
                       break;
                     case +HexType.Wool:
                       if(this.addResource({brick: 0, lumber: 0, wool: -2, grain: 0, ore: 0})){
                         value.addResource({brick: 0, lumber: 0, wool: 2, grain: 0, ore: 0});
                       }
                       break;
                     case +HexType.Grain:
                       if(this.addResource({brick: 0, lumber: 0, wool: 0, grain: -2, ore: 0})){
                         value.addResource({brick: 0, lumber: 0, wool: 0, grain: 2, ore: 0});
                       }
                       break;
                     case +HexType.Ore:
                       if(this.addResource({brick: 0, lumber: 0, wool: 0, grain: 0, ore: -2})){
                         value.addResource({brick: 0, lumber: 0, wool: 0, grain: 0, ore: 2});
                       }
                       break;
                     case +HexType.gold:
                       this.getGame().goldReceive.push(vertex.owner_id, vertex.owner_id);
                       this.getGame().state = Gamestate.AWAIT_GOLD_SELECTION;
                       break;
                   }
                 }
               })
             }
           }
         }
       }
      });
    });
  }

  nextTurn(){
    this.game.turn++;
    this.getGame().state = this.determinePhase();
    this.determineNextPlayer();
  }

  determineNextPlayer(){
    this.game.whos_turn = this.game.players[this.game.turn % this.game.players.length];
  }

  determinePrevPlayer(){
    this.game.whos_turn = this.game.players[this.game.players.length - (this.game.turn % this.game.players.length) - 1];
  }

  role_dice(){
    const points = (Math.floor(Math.random() * 6) + 1)+(Math.floor(Math.random() * 6) + 1)
    this.game.roll_history.push(points);
    //Robber turn
    if(points === 7){
      Array.from(this.player_details.values()).forEach(value => {
        if (this.getResourceNumber(value.sub) > 7){
          this.getGame().taxEvaders.push(value.meta.PID);
        }
      })
      if (this.getGame().taxEvaders.length === 0){
        this.getGame().state = Gamestate.PLACE_ROBBER
      }else{
        const taxEvaders = []
        Array.from(this.player_details.values()).forEach(value => {
          if (value.meta.resourceAmount > 7){
            taxEvaders.push(value.meta.PID);
          }
        });
        this.getGame().state = Gamestate.HALF_RESOURCES;
      }
    }
    //Normal turn
    else{
      this.distributeEarnings()
      if (this.getGame().state !== Gamestate.AWAIT_GOLD_SELECTION){
        this.getGame().state = Gamestate.TURN;
      }
      else{
        console.log(`Following people receiving resources: `);
        console.log(this.getGame().goldReceive);
      }
    }
  }

  private determinePhase(): Gamestate {
    if (this.getGame().state === Gamestate.LOBBY){
      return Gamestate.PREPARATION;
    }
    if (this.getGame().state === Gamestate.PREPARATION){
      return Gamestate.INITIAL_PLACE_FORWARD
    }
    if (this.getGame().state === Gamestate.INITIAL_PLACE_FORWARD || this.getGame().state === Gamestate.INITIAL_PLACE_BACKWARD){
      const playerVertices = new Map<number, number>()
      this.getGame().vertices.forEach(line => {
        line.forEach(vertex => {
          if (vertex.owner_id){
            if(!playerVertices.get(vertex.owner_id)){
              playerVertices.set(vertex.owner_id, 1)
            }else{
              playerVertices.set(vertex.owner_id, playerVertices.get(vertex.owner_id) + 1);
            }
          }
        })
      });
      const playerEdges = new Map<number, number>()
      this.getGame().edges.forEach(line => {
        line.forEach(edge => {
          if (edge.owner_id){
            if(!playerEdges.get(edge.owner_id)){
              playerEdges.set(edge.owner_id, 1)
            }else{
              playerEdges.set(edge.owner_id, playerEdges.get(edge.owner_id) + 1);
            }
          }
        })
      });
      let allEdges = 0
      Array.from(playerEdges.values()).forEach(e => {
        allEdges += e.valueOf();
      })
      let allVertices = 0
      Array.from(playerVertices.values()).forEach(e => {
        allVertices += e.valueOf();
      })
      console.log(`Streets/Ships: ${allEdges}`)
      console.log(`Settlements: ${allVertices}`)
      //TODO remember how many buildings there where before, if not change in initial place, dont do next turn
      if (allEdges < this.player_details.size && allVertices < this.player_details.size){
        return Gamestate.INITIAL_PLACE_FORWARD;
      }
      if (allEdges < this.player_details.size * 2 && allVertices < 2 * this.player_details.size){
        return Gamestate.INITIAL_PLACE_BACKWARD;
      }else{
        return Gamestate.DICE;
      }
    }
    if (this.getGame().state === Gamestate.DICE){
      return Gamestate.TURN;
    }
    if (this.getGame().state === Gamestate.TURN){
      return Gamestate.DICE;
    }
  }

  nextPhase() {
    this.getGame().state = this.determinePhase();
  }

  /**
   * @param change of brick, lumber, wool, grain and ore
   * @returns true if valid change false if invalid change
   */
  addResource({brick, lumber, wool, grain, ore}): boolean {
    if (this.getGame().bank_res.brick + brick >= 0 && this.getGame().bank_res.lumber + lumber >= 0 && this.getGame().bank_res.wool + wool >= 0 &&
      this.getGame().bank_res.grain + grain >= 0 && this.getGame().bank_res.ore + ore >= 0){
      this.getGame().bank_res.brick += brick;
      this.getGame().bank_res.lumber += lumber;
      this.getGame().bank_res.wool += wool;
      this.getGame().bank_res.grain += grain;
      this.getGame().bank_res.ore += ore;
      return true;
    }else{
      return false;
    }
  }

  getResourceNumber(sub: any){
    const res_obj = this.getPlayerDetails(sub).getResources();
    return (res_obj.lumber + res_obj.brick + res_obj.wool + res_obj.grain + res_obj.ore);
  }

  checkNewIsland(vertex: Vertex): Hex[]{
    const adj_hexes = vertexToAdjHexes(vertex);
    let hex;
    if (this.getGame().hexes[adj_hexes[0][0]][adj_hexes[0][1]] && +this.getGame().hexes[adj_hexes[0][0]][adj_hexes[0][1]].type !== +HexType.water){
      hex = this.getGame().hexes[adj_hexes[0][0]][adj_hexes[0][1]]
    }else if (this.getGame().hexes[adj_hexes[1][0]][adj_hexes[1][1]] && +this.getGame().hexes[adj_hexes[1][0]][adj_hexes[1][1]].type !== +HexType.water){
      hex = this.getGame().hexes[adj_hexes[1][0]][adj_hexes[1][1]]
    }else if (this.getGame().hexes[adj_hexes[2][0]][adj_hexes[2][1]] && +this.getGame().hexes[adj_hexes[2][0]][adj_hexes[2][1]].type !== +HexType.water){
      hex = this.getGame().hexes[adj_hexes[2][0]][adj_hexes[2][1]]
    }else{
      throw new InternalServerErrorException('No adj Hex to Vertex is land')
    }
    console.log('Island of which hex belongs to: ')
    const island = new Set<Hex>();
    island.add(hex)
    let oldSize = -1
    while(island.size !== oldSize){
      oldSize = island.size
      Array.from(island.values()).forEach(hex => {
        const adj_hexes = hexToAdjHexes(hex);
        adj_hexes.forEach(adj_hex => {
          const hex_elem = this.getGame().hexes[adj_hex[0]][adj_hex[1]]
          if (+hex_elem.type !== +HexType.water){
            island.add(hex_elem);
          }
        })
      })
    }
    console.log(island);
    return Array.from(island);
  }

  getCurRoadOfSub(sub: any): void{
    const value = this.getPlayerDetails(sub);
    const possibleStarts: Edge[] = []
    this.getGame().edges.forEach(line => {
      line.forEach(edge => {
        const adj_edges = edgeToAdjEdges(edge);
        if (edge.owner_id === value.meta.PID && adj_edges){
          let count = 0;
          if (this.getGame().edges[adj_edges[0][0]] && this.getGame().edges[adj_edges[0][0]][adj_edges[0][1]] &&
            this.getGame().edges[adj_edges[0][0]][adj_edges[0][1]].owner_id === value.meta.PID){
            count ++;
          }
          if (this.getGame().edges[adj_edges[1][0]] && this.getGame().edges[adj_edges[1][0]][adj_edges[1][1]] && this.getGame().edges[adj_edges[1][0]][adj_edges[1][1]].owner_id === value.meta.PID){
            count ++;
          }
          if (this.getGame().edges[adj_edges[2][0]] && this.getGame().edges[adj_edges[2][0]][adj_edges[2][1]] && this.getGame().edges[adj_edges[2][0]][adj_edges[2][1]].owner_id === value.meta.PID){
            count ++;
          }
          if (this.getGame().edges[adj_edges[3][0]] && this.getGame().edges[adj_edges[3][0]][adj_edges[3][1]] && this.getGame().edges[adj_edges[3][0]][adj_edges[3][1]].owner_id === value.meta.PID){
            count ++;
          }
          if (count === 1 || count === 2){
            possibleStarts.push(edge);
          }
        }
      })
    })
    const myLengths: number[] = []
    console.log(possibleStarts);
    possibleStarts.forEach(edge => {
      const adj_edges = edgeToAdjEdges(edge);
      const length = this.getRoadLength(adj_edges, [], value.meta.PID, 0);
      myLengths.push(length);
    });
    value.meta.ownRoad = Math.max(...myLengths);
  }

  getLongestRoadOwner(): void{
    const longestRoads = new Map<number, number>()
    Array.from(this.player_details.values()).forEach(value => {
      longestRoads.set(value.meta.PID, value.meta.ownRoad);
    })
    console.log(longestRoads);
    const largestRoad = Math.max(...Array.from(longestRoads.values()))
    if (Array.from(longestRoads.values()).filter(value => value === largestRoad).length !== 1){
      // No one owns longest road
      if (this.getGame().longestRoadOwner !== null){
        Array.from(this.player_details.values()).forEach(value => {
          if (value.meta.PID === this.getGame().longestRoadOwner){
            value.meta.points -= 2;
          }
        })
        this.getGame().longestRoadOwner = null;
      }
    }
    else{
      // One person owns longest Road
      if (this.getGame().longestRoadOwner !== null){
        Array.from(this.player_details.values()).forEach(value => {
          if (value.meta.PID === this.getGame().longestRoadOwner){
            value.meta.points -= 2;
          }
        })
      }
      const longestOwner = Array.from(longestRoads.entries())
        .filter(({ 1: v }) => v === largestRoad)
        .map(([k]) => k);
      console.log(`${longestOwner} owns the longest road`);
      this.getGame().longestRoadOwner = longestOwner[0]
      Array.from(this.player_details.values()).forEach(value => {
        if (value.meta.PID === this.getGame().longestRoadOwner){
          value.meta.points += 2;
        }
      })
    }
  }

  private getRoadLength(adj_edges: number[][], prev: Edge[], owner: number, cur: number): number{
    const one = this.getGame().edges[adj_edges[0][0]][adj_edges[0][1]]
    const two = this.getGame().edges[adj_edges[1][0]][adj_edges[1][1]]
    const thr = this.getGame().edges[adj_edges[2][0]][adj_edges[2][1]]
    const fou = this.getGame().edges[adj_edges[3][0]][adj_edges[3][1]]
    const next: Edge[] = [];
    // TODO bugfix road length calculation
    let old_neigh_one = false;
    let old_neigh_two = false;
    let old_neigh_thr = false;
    let old_neigh_fou = false;
    console.log('second last element of previous checked roads')
    console.log(prev[prev.length-2]);
    if (prev[prev.length-2]) {
      const old_neighbours = edgeToAdjEdges(prev[prev.length-2])
      let old_one;
      try{
        old_one = this.getGame().edges[old_neighbours[0][0]][old_neighbours[0][1]];
      }catch(e){
        old_one = false;
      }
      let old_two;
      try{
        old_two = this.getGame().edges[old_neighbours[1][0]][old_neighbours[1][1]];
      }catch(e){
        old_two = false;
      }
      let old_thr;
      try{
        old_thr = this.getGame().edges[old_neighbours[2][0]][old_neighbours[2][1]];
      }catch(e){
        old_thr = false;
      }let old_fou;
      try{
        old_fou = this.getGame().edges[old_neighbours[3][0]][old_neighbours[3][1]];
      }catch(e){
        old_fou = false;
      }
      old_neigh_one = old_one === one || old_two === one || old_thr === one || old_fou === one;
      old_neigh_two = old_one === two || old_two === two || old_thr === two || old_fou === two;
      old_neigh_thr = old_one === thr || old_two === thr || old_thr === thr || old_fou === thr;
      old_neigh_fou = old_one === fou || old_two === fou || old_thr === fou || old_fou === fou;
    }
    if (one.owner_id === owner && prev.indexOf(one) === -1 && !old_neigh_one){
      next.push(one);
    }
    if (two.owner_id === owner && prev.indexOf(two) === -1 && !old_neigh_two){
      next.push(two);
    }
    if (thr.owner_id === owner && prev.indexOf(thr) === -1 && !old_neigh_thr){
      next.push(thr);
    }
    if (fou.owner_id === owner && prev.indexOf(fou) === -1 && !old_neigh_fou){
      next.push(fou);
    }
    console.log(next);
    console.log(prev);
    const lengths: number[] = []
    if (next.length === 0){
      lengths.push(cur);
    }else{
      next.forEach(value => {
        prev.push(value)
        const length = this.getRoadLength(edgeToAdjEdges(value), prev, owner, cur+1)
        lengths.push(length);
      })
    }
    return Math.max(...lengths);
  }

  getLargestArmyOwner(): any{
    const armyAmounts = []
    const owner = []
    Array.from(this.player_details.values()).forEach(value => {
      value.calculateOwnArmyForce();
      armyAmounts.push(value.meta.ownArmy)
      owner.push(value.meta.PID)
    })
    const maxLenght = Math.max(...armyAmounts);
    if (this.getGame().largestArmyOwner !== null){
      Array.from(this.player_details.values()).forEach(value => {
        if (value.meta.PID === this.getGame().largestArmyOwner){
          value.meta.points -= 2;
        }
      })
    }
    if (armyAmounts.filter(value => value === maxLenght).length !== 1){
      this.getGame().largestArmyOwner = null;
    }
    else{
      this.getGame().largestArmyOwner = owner[armyAmounts.indexOf(maxLenght)]
    }
    if (this.getGame().largestArmyOwner !== null){
      Array.from(this.player_details.values()).forEach(value => {
        if (value.meta.PID === this.getGame().largestArmyOwner){
          value.meta.points += 2;
        }
      })
    }
  }

  checkWinner() {
    Array.from(this.player_details.values()).forEach(player => {
      let vicPointDev = 0;
      player.development_cards.forEach(value => {
        if (value.type === DevelopmentCardType.Victorypoint && this.getGame().turn > value.bought + 1 && this.getGame().whos_turn.PID === player.meta.PID){
          vicPointDev += 1;
        }
      })
      if (player.meta.points + vicPointDev >= this.getGame().pointsToWin){
        this.getGame().state = Gamestate.OVER;
        this.getGame().winner = player.meta.name
      }
    })
  }
}
