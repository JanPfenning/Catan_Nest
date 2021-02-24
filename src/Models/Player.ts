import { BuildingResource } from './BuildingResource';
import { DevelopmentCard } from './DevelopmentCard';

export class Playerentity{
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
   * @param sub id from oauth account
   */
  sub:string;
  /**
   * @param PID id in current Lobby
   */
  readonly PID:number;
  /**
   * @param points current victory points
   */
  private points:number;
  /**
   * @param resources tuple of resource and amount
   */
  resources:[BuildingResource,number][]
  /**
   * @param develoment_cards tuple of dev_cards and amount
   */
  development_cards: [DevelopmentCard,number][]
  private structures_left: any;

  /**
   * @param name displayed name, not needed to be unique
   * @param colour hexcode of color in which player is shown
   * @param sub id from oauth account
   * @param PID id in current Lobby
   */
  constructor(name: string, colour: string, sub: string) {
    this.name = name;
    this.colour = colour;
    this.sub = sub;
    this.PID = Date.now();
    this.points = 0;
    this.resources = [
      [BuildingResource.Brick,0],
      [BuildingResource.Lumber,0],
      [BuildingResource.Wool,0],
      [BuildingResource.Grain,0],
      [BuildingResource.Ore,0],
    ];
    this.development_cards = [
      [DevelopmentCard.Knight,0],
      [DevelopmentCard.Roadbuilding,0],
      [DevelopmentCard.YearOfPlenty,0],
      [DevelopmentCard.Monopoly,0],
      [DevelopmentCard.Victorypoint,0],
    ];
    this.structures_left = {
      "settlement": 10,
      "city": 10,
      "ship": 10,
      "road": 10
    }
  }
}
