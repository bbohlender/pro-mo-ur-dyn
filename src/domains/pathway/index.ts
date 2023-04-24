import { Object3D } from "three"
import { Operations } from "../../index.js"
import { createGraph, expandGraph } from "./graph.js";

export type Pathway = { points: Array<{ x: number; y: number; size: number; astId: string }> }

export function pathwaysToObject3ds(pathways: Array<Pathway>): Array<Object3D> {
    const graph = createGraph(pathways)
    return expandGraph(graph)
}

export function isPathway(value: any): value is Pathway {
    return "points" in value
}

export const operations: Operations = {
    pathwayFrom: {
        defaultParameters: [],
        includeThis: false,
        execute: (next, astId, x: number, y: number, size = 3) => {
            return next({
                points: [{ x, y, size, astId }],
            })
        },
    },
    pathwayTo: {
        defaultParameters: [],
        includeThis: true,
        execute: (next, astId, value: Pathway, x: number, y: number, size = 3) => {
            value.points.push({ x, y, size, astId })
            return next(value)
        },
    },
}

export * from "./exporter.js"