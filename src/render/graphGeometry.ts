import { GraphNodeViewModel } from "./viewModel.js";

export const GRAPH_WIDTH = 1000;
export const GRAPH_HEIGHT = 390;
export const NODE_W = 150;
export const NODE_H = 70;

export interface Point {
  x: number;
  y: number;
}

export const GRAPH_COORDS: Record<
  string,
  { x: number; y: number; width: number; height: number }
> = {
  discover: { x: 48, y: 52, width: NODE_W, height: NODE_H },
  parse: { x: 255, y: 52, width: NODE_W, height: NODE_H },
  normalize: { x: 462, y: 52, width: NODE_W, height: NODE_H },
  correlate: { x: 669, y: 52, width: NODE_W, height: NODE_H },
  "agent-events": { x: 255, y: 170, width: NODE_W, height: NODE_H },
  commands: { x: 462, y: 170, width: NODE_W, height: NODE_H },
  "file-changes": { x: 669, y: 170, width: NODE_W, height: NODE_H },
  "git-state": { x: 462, y: 288, width: NODE_W, height: NODE_H },
  "diff-capture": { x: 669, y: 288, width: NODE_W, height: NODE_H },
  "replay-output": { x: 840, y: 288, width: NODE_W, height: NODE_H },
};

export function rightCenter(node: GraphNodeViewModel): Point {
  return { x: node.x + node.width, y: node.y + node.height / 2 };
}
export function leftCenter(node: GraphNodeViewModel): Point {
  return { x: node.x, y: node.y + node.height / 2 };
}
export function topCenter(node: GraphNodeViewModel): Point {
  return { x: node.x + node.width / 2, y: node.y };
}
export function bottomCenter(node: GraphNodeViewModel): Point {
  return { x: node.x + node.width / 2, y: node.y + node.height };
}
export function straightPath(from: Point, to: Point): string {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}
export function elbowPath(
  from: Point,
  to: Point,
  options: { radius?: number } = {},
): string {
  const r = Math.min(
    options.radius ?? 12,
    Math.abs(to.x - from.x) / 2,
    Math.abs(to.y - from.y) / 2 || (options.radius ?? 12),
  );
  const midX = from.x + (to.x - from.x) / 2;
  if (Math.abs(from.y - to.y) < 1) return straightPath(from, to);
  const sy = Math.sign(to.y - from.y) || 1;
  const sx = Math.sign(to.x - from.x) || 1;
  return `M ${from.x} ${from.y} H ${midX - sx * r} Q ${midX} ${from.y} ${midX} ${from.y + sy * r} V ${to.y - sy * r} Q ${midX} ${to.y} ${midX + sx * r} ${to.y} H ${to.x}`;
}
export function verticalElbowPath(
  from: Point,
  to: Point,
  options: { radius?: number } = {},
): string {
  const r = options.radius ?? 12;
  if (Math.abs(from.x - to.x) < 1) return straightPath(from, to);
  const midY = from.y + (to.y - from.y) / 2;
  const sy = Math.sign(to.y - from.y) || 1;
  const sx = Math.sign(to.x - from.x) || 1;
  return `M ${from.x} ${from.y} V ${midY - sy * r} Q ${from.x} ${midY} ${from.x + sx * r} ${midY} H ${to.x - sx * r} Q ${to.x} ${midY} ${to.x} ${midY + sy * r} V ${to.y}`;
}
