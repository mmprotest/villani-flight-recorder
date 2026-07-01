export const GRAPH_WIDTH = 1040;
export const GRAPH_HEIGHT = 390;
export const NODE_W = 150;
export const NODE_H = 68;
export const GRAPH_NODE_LAYOUT = {
    discover: { x: 40, y: 58, width: NODE_W, height: NODE_H },
    parse: { x: 240, y: 58, width: NODE_W, height: NODE_H },
    normalize: { x: 440, y: 58, width: NODE_W, height: NODE_H },
    correlate: { x: 640, y: 58, width: NODE_W, height: NODE_H },
    replayOutput: { x: 840, y: 58, width: NODE_W, height: NODE_H },
    agentEvents: { x: 440, y: 180, width: NODE_W, height: NODE_H },
    commandsTools: { x: 640, y: 180, width: NODE_W, height: NODE_H },
    fileChanges: { x: 840, y: 180, width: NODE_W, height: NODE_H },
    gitState: { x: 640, y: 300, width: NODE_W, height: NODE_H },
    diffCapture: { x: 840, y: 300, width: NODE_W, height: NODE_H },
};
export const GRAPH_COORDS = {
    discover: GRAPH_NODE_LAYOUT.discover,
    parse: GRAPH_NODE_LAYOUT.parse,
    normalize: GRAPH_NODE_LAYOUT.normalize,
    correlate: GRAPH_NODE_LAYOUT.correlate,
    "replay-output": GRAPH_NODE_LAYOUT.replayOutput,
    "agent-events": GRAPH_NODE_LAYOUT.agentEvents,
    commands: GRAPH_NODE_LAYOUT.commandsTools,
    "file-changes": GRAPH_NODE_LAYOUT.fileChanges,
    "git-state": GRAPH_NODE_LAYOUT.gitState,
    "diff-capture": GRAPH_NODE_LAYOUT.diffCapture,
};
export function leftCenter(node) {
    return { x: node.x, y: node.y + node.height / 2 };
}
export function rightCenter(node) {
    return { x: node.x + node.width, y: node.y + node.height / 2 };
}
export function topCenter(node) {
    return { x: node.x + node.width / 2, y: node.y };
}
export function bottomCenter(node) {
    return { x: node.x + node.width / 2, y: node.y + node.height };
}
export function straightPath(from, to) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}
export function elbowPath(from, to, options = {}) {
    if (Math.abs(from.y - to.y) < 1 || Math.abs(from.x - to.x) < 1) {
        return straightPath(from, to);
    }
    const corner = { x: options.viaX ?? to.x, y: options.viaY ?? from.y };
    const r = Math.min(options.radius ?? 10, Math.abs(corner.x - from.x) / 2, Math.abs(to.y - corner.y) / 2);
    const sx = Math.sign(corner.x - from.x) || 1;
    const sy = Math.sign(to.y - corner.y) || 1;
    return `M ${from.x} ${from.y} H ${corner.x - sx * r} Q ${corner.x} ${from.y} ${corner.x} ${from.y + sy * r} V ${to.y}`;
}
export function verticalDropPath(from, to, options = {}) {
    if (Math.abs(from.x - to.x) < 1)
        return straightPath(from, to);
    const midY = from.y + (to.y - from.y) / 2;
    return elbowPath(from, { x: to.x, y: midY }, options) + ` L ${to.x} ${to.y}`;
}
