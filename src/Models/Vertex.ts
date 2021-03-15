import { Structure } from './Structure';

export class Vertex{
  x: number
  y: number
  building: Structure
  owner_id: null|number
  additionalPoint = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.building = null;
    this.owner_id = null;
  }
}
