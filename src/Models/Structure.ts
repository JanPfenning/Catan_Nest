import { BuildingResource } from './BuildingResource';

export enum Structure{
  Settlement ,City,Road,Ship,DevelopmentCard
}

export function getCost(structure: Structure): BuildingResource[] {
  switch (structure) {
    case Structure.Settlement:
      return [
          BuildingResource.Wool,
          BuildingResource.Lumber,
          BuildingResource.Brick,
          BuildingResource.Grain,
        ];
    case Structure.City:
      return [
          BuildingResource.Grain,
          BuildingResource.Grain,
          BuildingResource.Ore,
          BuildingResource.Ore,
          BuildingResource.Ore,
       ];
    case Structure.Road:
      return [
          BuildingResource.Brick,
          BuildingResource.Lumber
        ];
    case Structure.Ship:
      return [
          BuildingResource.Wool,
          BuildingResource.Lumber,
        ];
    case Structure.DevelopmentCard:
      return [
          BuildingResource.Wool,
          BuildingResource.Grain,
          BuildingResource.Ore
      ];
  }
}
