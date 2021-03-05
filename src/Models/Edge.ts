import { Structure } from './Structure';

export class Edge{
  x: number
  y: number
  building: Structure
  owner_id: number

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.building = null;
    this.owner_id = null;
  }
}
