import { Structure } from './Models/Structure';
import { Game } from './game/Game';
import { Playerentity } from './Models/Player';
import { Gamestate } from './Models/Gamestate';
import { hexToAdjVertices, vertexToAdjHexes } from './translator';
import { HexType } from './Models/HexType';
import { HttpException, HttpStatus } from '@nestjs/common';
import { DevelopmentCard, DevelopmentCardType } from './Models/DevelopmentCard';
import { GameService } from './game/game.service';

export class Gamemanager {
  private game: Game;
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
                }
              }catch (e) {
                console.log(e)
              }
            }
          }
          this.getPlayerDetails(sub).meta.structures_left.settlement -= 1;
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
            this.addResource({brick: 0, lumber: 0, wool: 0, grain: 2, ore: 3})
          }else{
            throw new HttpException('Insufficient resources or no city left', HttpStatus.BAD_REQUEST);
          }
          break;
        }
        case +Structure.Settlement:{
          if (this.getPlayerDetails(sub).addResource({brick: -1, lumber: -1, wool: -1, grain: -1, ore: 0}) &&
            this.getPlayerDetails(sub).meta.structures_left.settlement >= 1){
            const vertex = this.getGame().vertices[x][y];
            vertex.building = structure;
            vertex.owner_id = this.getPlayerDetails(sub).meta.PID;
            vertex.x = x;
            vertex.y = y;
            this.getPlayerDetails(sub).meta.structures_left.settlement -= 1;
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

  distributeEarnings(points:number):void{
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
      // TODO Robbersturn
    }
    //Normal turn
    else{
      this.distributeEarnings(this.getGame().roll_history[this.getGame().roll_history.length-1])
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
   *
   * @param change of brick, lumber, wool, grain and ore
   * @returns true if valid change false if invalid change
   */
  private addResource({brick, lumber, wool, grain, ore}): boolean {
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
}
