import { BuildingResource } from './BuildingResource';
import { Structure } from './Structure';
import { DevelopmentCard } from './DevelopmentCard';

export class Playerentity{
  readonly name:string;
  readonly color:string;
  readonly id:string;
  private points:number;
  private resources:[BuildingResource,number][]
  private structures: [Structure,number][]
  private development_cards: DevelopmentCard[]

  constructor(name: string, color: string, id: string) {
    this.name = name;
    this.color = color;
    this.id = id;
    this.points = 0;
    this.resources = [
      [BuildingResource.Brick,0],
      [BuildingResource.Lumber,0],
      [BuildingResource.Wool,0],
      [BuildingResource.Grain,0],
      [BuildingResource.Ore,0],
    ];
    this.structures = [
      [Structure.Settlement,5],
      [Structure.City,3],
      [Structure.Road,15],
      [Structure.Ship,15],
    ];
  }
}
