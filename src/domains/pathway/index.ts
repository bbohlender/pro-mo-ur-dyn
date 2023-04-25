import { BufferGeometry } from "three"
import { Operations } from "../../index.js"
import { createGraph, expandGraph } from "./graph.js"
import { Queue } from "../../interpreter/queue.js"

export type Pathway = { points: Array<{ x: number; y: number; size: number; astId: string }> }

export function getPathwaysGeometry(queue: Queue): BufferGeometry | null {
    if (queue.resultCache.pathways !== undefined) {
        return queue.resultCache.pathways
    }
    return (queue.resultCache.pathways = pathwaysToGeometry(queue.results.map(({ raw }) => raw).filter(isPathway)))
}

export function pathwaysToGeometry(pathways: Array<Pathway>): BufferGeometry | null {
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
        includeQueue: false,
        execute: (next, astId, x: number, y: number, size = 3) => {
            return next({
                points: [{ x, y, size, astId }],
            })
        },
    },
    pathwayTo: {
        defaultParameters: [],
        includeThis: true,
        includeQueue: false,
        execute: (next, astId, value: Pathway, x: number, y: number, size = 3) => {
            value.points.push({ x, y, size, astId })
            return next(value)
        },
    },
}

export * from "./exporter.js"
