import { BuildingResource } from './Models/BuildingResource';
import { DevelopmentCard } from './Models/DevelopmentCard';
import { Playerentity } from './Models/Player';

export class Gameobject {
  readonly gameid;
  readonly players;
  readonly rules;
  readonly settings;

  public _turn_playerid: number;
  public _current_turn: number;
  public _bank_resources: {resource: BuildingResource, amount: number}[];
  public _development_cards_available = [];
  private _cur_eyes: number;
  private _roled_eyes: number[];
  public map: any;

  constructor(gameid: number,
  rules: {
    points2win: number,
    max_available_resources: number,
    knightCardsAmount: number
    victorypointCardsAmount: number,
    monopolyCardsAmount: number,
    roadbuildingCardsAmount: number,
    yearOfPlentyCardsAmount: number,
    res_fields: {
      brick: number,
      lumber: number,
      wool: number,
      grain: number,
      ore: number,
      gold: number,
    },
    board_height: number,
    board_width: number,
  }, map: any) {
    this.rules = rules
    this.gameid = gameid;
    //this.map = map;

    this._roled_eyes = [];
    this._turn_playerid = -1;
    this._current_turn = 0;
    this._bank_resources = []

    this.fillBankRes(rules);
    this.fillDevCards(rules);
  }

  fillDevCards(rules: { points2win: number; max_available_resources: number; knightCardsAmount: number; victorypointCardsAmount: number; monopolyCardsAmount: number; roadbuildingCardsAmount: number; yearOfPlentyCardsAmount: number }) {
    this._development_cards_available = [];
    for (let i = 0; i < rules.knightCardsAmount; i++) {
      this._development_cards_available.push(DevelopmentCard.Knight);
    }
    for (let i = 0; i < rules.victorypointCardsAmount; i++) {
      this._development_cards_available.push(DevelopmentCard.Victorypoint);
    }
    for (let i = 0; i < rules.monopolyCardsAmount; i++) {
      this._development_cards_available.push(DevelopmentCard.Monopoly);
    }
    for (let i = 0; i < rules.roadbuildingCardsAmount; i++) {
      this._development_cards_available.push(DevelopmentCard.Roadbuilding);
    }
    for (let i = 0; i < rules.yearOfPlentyCardsAmount; i++) {
      this._development_cards_available.push(DevelopmentCard.YearOfPlenty);
    }
    //Shuffle Developmentcards after initializing them O(n)
    this._development_cards_available = shuffle(this._development_cards_available);
    // => O(n+n) = O(2n) = O(n)
  }

  // Used for giving out resources
  decrementBankResources(resource:BuildingResource){
    switch(resource){
      case BuildingResource.Brick:
        this._bank_resources[0].amount--;
        break;
      case BuildingResource.Lumber:
        this._bank_resources[1].amount--;
        break;
      case BuildingResource.Wool:
        this._bank_resources[2].amount--;
        break;
      case BuildingResource.Grain:
        this._bank_resources[3].amount--;
        break;
      case BuildingResource.Ore:
        this._bank_resources[4].amount--;
        break;
      default:
        break;
    }
  }

  // Used for building structures
  incrementBankResources(resource:BuildingResource){
    switch(resource){
      case BuildingResource.Brick:
        this._bank_resources[0].amount++;
        break;
      case BuildingResource.Lumber:
        this._bank_resources[1].amount++;
        break;
      case BuildingResource.Wool:
        this._bank_resources[2].amount++;
        break;
      case BuildingResource.Grain:
        this._bank_resources[3].amount++;
        break;
      case BuildingResource.Ore:
        this._bank_resources[4].amount++;
        break;
      default:
        break;
    }  }

  toJSON(): any{
    return {
      gameid: this.gameid,
      rules: this.rules,
      settings: this.settings,
      map: this.map,
      eyes: this._cur_eyes
    };
  }

  get cur_eyes(): number {
    return this._cur_eyes;
  }

  set cur_eyes(value: number) {
    this._cur_eyes = value;
    this._roled_eyes.push(value);
  }

  get roled_eyes(): number[]{
    return this._roled_eyes;
  }

  fillBankRes(rules: { points2win: number; max_available_resources: number; knightCardsAmount: number; victorypointCardsAmount: number; monopolyCardsAmount: number; roadbuildingCardsAmount: number; yearOfPlentyCardsAmount: number }) {
    console.log(rules);
    this._bank_resources.push({resource: BuildingResource.Brick, amount: rules.max_available_resources});
    this._bank_resources.push({resource: BuildingResource.Lumber, amount: rules.max_available_resources});
    this._bank_resources.push({resource: BuildingResource.Wool, amount: rules.max_available_resources});
    this._bank_resources.push({resource: BuildingResource.Grain, amount: rules.max_available_resources});
    this._bank_resources.push({resource: BuildingResource.Ore, amount: rules.max_available_resources});

  }
}

function shuffle(array: any[]): any[]{
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}
