import { BufferGeometry } from "three"
import { Operations } from "../../index.js"
import { createGraph, expandGraph } from "./graph.js"

export type Pathway = { points: Array<{ x: number; y: number; size: number; astId: string }>; type: string }

export function pathwaysToGeometry(pathways: Array<Pathway>, type: string): BufferGeometry | null {
    const graph = createGraph(pathways, type)
    return expandGraph(graph)
}

export function isPathway(value: any): value is Pathway {
    return "points" in value
}

export const operations: Operations = {
    pathwayFrom: {
        defaultParameters: [],
        includeThis: true,
        includeQueue: false,
        execute: (next, astId, pathway: Pathway, x: number, y: number, size: number) => {
            return next({
                points: [{ x, y, size, astId }],
                type: pathway.type,
            } satisfies Pathway)
        },
    },
    pathwayTo: {
        defaultParameters: [],
        includeThis: true,
        includeQueue: false,
        execute: (next, astId, value: Pathway, x: number, y: number, size: number) => {
            value.points.push({ x, y, size, astId })
            return next(value)
        },
    },
}

export * from "./exporter.js"
