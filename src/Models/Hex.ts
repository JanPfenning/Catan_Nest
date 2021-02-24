import { HexType } from './HexType';

export class Hex{
  x: number
  y: number
  nr: number
  type: HexType
  knight: boolean

  constructor(x: number, y: number, nr: number, type: HexType) {
    this.x = x;
    this.y = y;
    this.nr = nr;
    this.type = type;
    this.knight = false;
  }
}
