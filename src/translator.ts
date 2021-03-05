import {Vertex} from './Models/Vertex';
import {Hex} from './Models/Hex';
import {Edge} from './Models/Edge';

export function sign(p1: {x: number, y: number}, p2: {x: number, y: number}, p3: {x: number, y: number}): number {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

export function pointInTriangle(pt: {x: number, y: number},
                                v1: {x: number, y: number},
                                v2: {x: number, y: number},
                                v3: {x: number, y: number}): boolean{
  const d1 = sign(pt, v1, v2);
  const d2 = sign(pt, v2, v3);
  const d3 = sign(pt, v3, v1);

  const has_neg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const has_pos = (d1 > 0) || (d2 > 0) || (d3 > 0);

  return !(has_neg && has_pos);
}

export function hexToRgb(hex: string): {r: number, g: number, b: number} | null {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => {
    return r + r + g + g + b + b;
  });

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export function getHighContrast(hex: string): string{
  const{r, g, b} = hexToRgb(hex);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 186 ? '#000000' : '#ffffff';
}
/////////////////////////////////////////////////////////
//
//  Hex to adjacent
//
/////////////////////////////////////////////////////////
/**
 * used for e.g. generating reasonable islands
 * @param h Hex which adjacent Hexes are to be determined
 * @returns List of adjacent Hexes
 */
export function hexToAdjHexes(h: Hex) {
  if (h.y % 2 !== 0) {
    return [[h.x, h.y - 1], [h.x + 1, h.y], [h.x, h.y + 1], [h.x - 1, h.y + 1], [h.x - 1, h.y], [h.x - 1, h.y - 1]];
  }else{
    return [[h.x + 1, h.y - 1], [h.x + 1, h.y], [h.x + 1, h.y + 1], [h.x, h.y + 1], [h.x - 1, h.y], [h.x, h.y - 1]];
  }
}

/**
 * used for e.g. distribute earnings
 * @param h Hex which adjacent Vertices are to be determined
 * @returns List of adjacent Edges
 */
export function hexToAdjVertices(h: Hex) {
  if (h.y % 2 !== 0) {
    return [[2 * h.x + 1, 2 * h.y], [2 * h.x + 2, 2 * h.y + 1], [2 * h.x + 2, 2 * h.y + 2],
            [2 * h.x + 1, 2 * h.y + 3], [2 * h.x, 2 * h.y + 2], [2 * h.x, 2 * h.y + 1]];
  }else{
    return [[2 * h.x + 2, 2 * h.y], [2 * h.x + 3, 2 * h.y + 1], [2 * h.x + 3, 2 * h.y + 2],
            [2 * h.x + 2, 2 * h.y + 3], [2 * h.x + 1, 2 * h.y + 2], [2 * h.x + 1, 2 * h.y + 1]];
  }
}

/**
 * no example usage found yet
 * @param h Hex which adjacent Edges are to be determined
 * @returns List of adjacent Edges
 */
export function hexToAdjEdges(h: Hex) {
  if (h.y % 2 !== 0) {
    return [[4 * h.x + 3, 2 * h.y], [4 * h.x + 4, 2 * h.y + 1], [4 * h.x + 3, 2 * h.y + 2],
            [4 * h.x + 1, 2 * h.y + 2], [4 * h.x, 2 * h.y + 1], [4 * h.x + 1, 2 * h.y]];
  }else{
    return [[4 * h.x + 5, 2 * h.y], [4 * h.x + 6, 2 * h.y + 1], [4 * h.x + 5, 2 * h.y + 2],
            [4 * h.x + 3, 2 * h.y + 2], [4 * h.x + 2, 2 * h.y + 1], [4 * h.x + 3, 2 * h.y]];
  }
}

/////////////////////////////////////////////////////////
//
//  Edge to adjacent
//
/////////////////////////////////////////////////////////
/**
 * used to determine facing
 * @param e Edge which facing is to be determined
 * @returns facing
 */
export function edgeToFacing(e: Edge): 'vertical'|'negative'|'positive'{
  if ((e.x + 1) % 4 === 0 && (e.y + 2) % 4 === 0){
    return 'negative';
  }else if ((e.x + 3) % 4 === 0 && e.y % 4 === 0){
    return 'negative';
  }else if (e.x % 2 === 0){
    return 'vertical';
  }else if ((e.x + 1) % 4 === 0 && e.y % 4 === 0){
    return 'positive';
  }else if ((e.x + 3) % 4 === 0 && (e.y + 2) % 4 === 0){
    return 'positive';
  }
  return null;
}
/**
 * used for e.g. denying streets in water and ships on land
 * @param e Edge which adjacent Hexes are to be determined
 * @returns List of adjacent Hexes
 */
export function edgeToAdjHexes(e: Edge) {
  if (e.y % 2 === 0){
    if (e.y % 4 === 0){
      if ((e.x + 1) % 4 === 0){
        return [[Math.floor(e.x / 4), (e.y / 2) - 1], [Math.floor(e.x / 4), (e.y / 2)]];
      }else{
        return [[Math.floor(e.x / 4) - 1, (e.y / 2)], [Math.floor(e.x / 4), (e.y / 2) - 1]];
      }
    }else{
      if ((e.x + 1) % 4 === 0){
        return [[Math.floor(e.x / 4), (e.y / 2)], [Math.floor(e.x / 4), (e.y / 2) - 1]];
      }else{
        return [[Math.floor(e.x / 4) - 1, (e.y / 2) - 1], [Math.floor(e.x / 4), (e.y / 2)]];
      }
    }
  }else{
    return [[Math.floor(e.x / 4) - 1, Math.floor(e.y / 2)], [Math.floor(e.x / 4), Math.floor(e.y / 2)]];
  }
}

/**
 * used for e.g. denying starting to sail or exploring land without dock-like settlement
 * @param e Edge which adjacent Vertices are to be determined
 * @returns List of adjacent Edges
 */
export function edgeToAdjVertices(e: Edge) {
  if (e.y % 2 !== 0 && e.x % 2 === 0){
    return [[e.x / 2, e.y ], [e.x / 2, e.y + 1]];
  }else if (((e.y + 2) % 4 === 0) && (e.x + 1) % 4 === 0 || (e.y) % 4 === 0 && (e.x + 3) % 4 === 0){
      return [[(e.x - 1) / 2, e.y ], [(e.x + 1) / 2, e.y + 1]];
    }
  else if (((e.y) % 4 === 0 && (e.x + 1) % 4 === 0) || ((e.y + 2) % 4 === 0 && (e.x + 3) % 4 === 0)){
    return [[(e.x + 1) / 2, e.y ], [(e.x - 1) / 2, e.y + 1]];
  }
}

/**
 * used for e.g. denying street and ships without connection
 * @param e Edge which adjacent Edges are to be determined
 * @returns List of adjacent Edges (Clockwise 1 is never straight up)
 */
export function edgeToAdjEdges(e: Edge) {
  if (e.y % 2 !== 0 && e.x % 2 === 0){
    return [[e.x + 1, e.y - 1], [e.x + 1, e.y + 1], [e.x - 1, e.y - 1], [e.x - 1, e.y + 1]];
  }else if (((e.y + 2) % 4 === 0) && (e.x + 1) % 4 === 0 || (e.y) % 4 === 0 && (e.x + 3) % 4 === 0){
    return [[e.x - 2, e.y], [e.x + 2, e.y], [e.x + 1, e.y + 1], [e.x - 1, e.y - 1]];
  }
  else if (((e.y) % 4 === 0 && (e.x + 1) % 4 === 0) || ((e.y + 2) % 4 === 0 && (e.x + 3) % 4 === 0)){
    return [[e.x - 2, e.y], [e.x + 2, e.y], [e.x - 1, e.y + 1], [e.x + 1, e.y - 1]];
  }
}

/////////////////////////////////////////////////////////
//
//  Vertex to adjacent
//
/////////////////////////////////////////////////////////
/**
 * used for e.g. denying settlement in water
 * @param v Vertex which adjacent Hexes are to be determined
 * @returns List of adjacent Hexes
 */
export function vertexToAdjHexes(v: Vertex) {
  if (v.y % 2 !== 0){
    if (v.x % 2 !== 0){
      // Odd x Odd y
      return [[Math.floor(v.x / 2) - 1, Math.floor(v.y / 2)],
              [Math.floor(v.x / 2), Math.floor(v.y / 2)],
              [Math.floor(v.x / 2), Math.floor(v.y / 2) - 1]];
    }else{
      // Even x Odd y
      return [[v.x / 2 - 1, Math.floor(v.y / 2)],
              [v.x / 2, Math.floor(v.y / 2)],
              [v.x / 2 - 1, Math.floor(v.y / 2) - 1]];
    }
  }else{
    if (v.x % 2 !== 0){
      // Odd x Even y
      return [[Math.floor(v.x / 2) - 1, v.y / 2 - 1],
              [Math.floor(v.x / 2), v.y / 2 - 1],
              [Math.floor(v.x / 2), v.y / 2]];
    }else{
      // Even x Even y
      return [[v.x / 2 - 1, v.y / 2 - 1],
              [v.x / 2, v.y / 2 - 1],
              [v.x / 2 - 1, v.y / 2]];
    }
  }
}

/**
 * used for e.g. denying settlement directly next to another settlement
 * @param v Vertex which adjacent Vertices are to be determined
 * @returns List of adjacent Vertices
 */
export function vertexToAdjVertices(v: Vertex) {
  if (v.y % 2 !== 0){
    return [[v.x - 1, v.y - 1],
            [v.x + 1, v.y - 1],
            [v.x    , v.y + 1]];
  }else{
    return [[v.x - 1, v.y + 1],
            [v.x + 1, v.y + 1],
            [v.x    , v.y - 1]];
  }
}

/**
 * used for e.g. denying settlement without connection
 * @param v Vertex which adjacent Edges are to be determined
 * @returns List of adjacent Edges
 */
export function vertexToAdjEdges(v: Vertex) {
  // TODO implement vertex to adj edges
  return null;
}
