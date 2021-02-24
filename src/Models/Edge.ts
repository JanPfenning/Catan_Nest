import { Structure } from './Structure';

export class Edge{
  x: number
  y: number
  building: null|Structure.Ship|Structure.Road
  owner_id: null|string

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.building = null;
    this.owner_id = null;
  }
}
