import { DevelopmentCard, DevelopmentCardType } from './DevelopmentCard';

export class Meta {
  /**
   * @param owner is the user owner of the lobby
   */
  readonly owner: boolean
  /**
   * @param name displayed name, not needed to be unique
   */
  readonly name:string;
  /**
   * @param colour hexcode of color in which player is shown
   */
  readonly colour:string;
  /**
   * @param PID id in current Lobby
   */
  readonly PID:number;
  /**
   * @param points current victory points
   */
  points:number;

  /**
   * @param structures_left tuple of structures and amount
   */
  structures_left: {
    settlement: number,
    city: number,
    ship: number,
    road: number
  };

  /**
   * @param longestRoad length of own road
   */
  ownRoad = 0;

  /**
   * @param largestArmy size of own army
   */
  ownArmy = 0;

  /**
   * @param resourceAmount number of resources
   */
  resourceAmount = 0;

  /**
   * @param devAmount number of development cards
   */
  devAmount = 0;

  constructor(name: string, colour: string) {
    this.name = name;
    this.colour = colour;
    this.PID = Date.now();
    this.points = 0;
    this.structures_left = {
      'settlement': 5,
      'city': 4,
      'ship': 15,
      'road': 15,
    };
  }
}

export class Playerentity{

  /**
   * @param sub id from oauth account
   */
  readonly sub: string;

  /**
   * @param resources tuple of resource and amount
   */
  private resources: {
    'brick': 0,
    'lumber': 0,
    'wool': 0,
    'grain': 0,
    'ore': 0,
  };

  /**
   * @param develoment_cards tuple of dev_cards and amount
   */
  public development_cards: DevelopmentCard[] = [];

  /**
   * @param meta Meta information that can be published
   */
  meta: Meta;

  /**
   * @param name displayed name, not needed to be unique
   * @param colour hexcode of color in which player is shown
   * @param sub id from oauth account
   */
  constructor(name: string, colour: string, sub: string) {
    this.meta = new Meta(name, colour)
    this.sub = sub;
    this.resources = {
      'brick': 0,
      'lumber': 0,
      'wool': 0,
      'grain': 0,
      'ore': 0,
    };
    
    this.development_cards = [];

  }

  addResource({brick, lumber, wool, grain, ore}): boolean{
    if (this.resources.brick + brick >= 0 && this.resources.lumber + lumber >= 0 && this.resources.wool + wool >= 0 &&
        this.resources.grain + grain >= 0 && this.resources.ore + ore >= 0){
      this.resources.brick += brick;
      this.resources.lumber += lumber;
      this.resources.wool += wool;
      this.resources.grain += grain;
      this.resources.ore += ore;
      this.meta.resourceAmount = this.resources.brick + this.resources.lumber + this.resources.wool + this.resources.grain + this.resources.ore;
      return true;
    }else{
      return false;
    }
  }

  getResources(): any{
    return this.resources;
  }

  setResources(resources: any) {
    this.resources = resources;
    this.meta.resourceAmount = this.resources.brick + this.resources.lumber + this.resources.wool + this.resources.grain + this.resources.ore;
  }

  calculateOwnArmyForce(){
    let amount = 0;
    this.development_cards.forEach(value => {
      if (value.used && value.type === DevelopmentCardType.Knight){
        amount++;
      }
    })
    this.meta.ownArmy = amount;
  }
}
