import { Structure } from './Structure';

export class Vertex{
  x: number
  y: number
  building: null|Structure.Settlement|Structure.City
  owner_id: null|number

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.building = null;
    this.owner_id = null;
  }
}
