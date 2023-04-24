import { VectorTile, VectorTileLayer } from "@mapbox/vector-tile"
import Protobuf from "pbf"
import { NestedDescription, NestedDescriptions, NestedTransformation, filterNull } from "pro-3d-video"

export function tile2lat(y: number, zoom: number) {
    const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom)
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

/**
 * @example meter = tile * tileMeterRatio(y, zoom)
 */
export function tileMeterRatio(y: number, zoom: number, tilePixelSize = 256): number {
    const lat = tile2lat(y, zoom)
    return ((156543.03 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom)) * tilePixelSize
}

export type Layers = {
    [Layer in string]: Array<{
        properties: any
        geometry: Array<Array<{ x: number; y: number }>>
    }>
}

export async function loadMapLayers(url: string, y: number, zoom: number, tilePixelSize = 256): Promise<Layers> {
    const sizeInMeter = /** 1 tile */ tileMeterRatio(y, zoom, tilePixelSize)
    const response = await fetch(url)
    const data = await response.arrayBuffer()
    const vectorTile = new VectorTile(new Protobuf(data))
    return Object.entries(vectorTile.layers).reduce((prev, [name, layer]: [string, VectorTileLayer]) => {
        const meterToIntegerRatio = sizeInMeter / layer.extent
        return {
            ...prev,
            [name]: new Array(layer.length).fill(null).map((_, i) => {
                const feature = layer.feature(i)
                const geometry = feature
                    .loadGeometry()
                    .map((points) => {
                        const polygon = new Array<{ x: number; y: number }>(points.length)
                        for (let i = 0; i < points.length; i++) {
                            const { x, y } = points[i]
                            polygon[i] = {
                                x: x * meterToIntegerRatio,
                                y: y * meterToIntegerRatio,
                            }
                        }
                        return polygon
                    })
                    .filter((points) => points.length > 0)
                return {
                    properties: feature.properties,
                    geometry,
                }
            }),
        }
    }, {} as Layers)
}

export function convertPathwaysToDescription(layers: Layers): NestedDescription {
    return {
        rootNounIdentifier: "Start",
        initialVariables: { type: "pathway" },
        nouns: {
            Start: {
                transformation: {
                    type: "parallel",
                    children: layers["road"]
                        .filter((feature) => feature.properties.class === "street")
                        .reduce<Array<NestedTransformation>>((prev, feature) => {
                            prev.push(
                                ...feature.geometry.map<NestedTransformation>((polygon) =>
                                    convertPolygonStreetToDescription(polygon)
                                )
                            )
                            return prev
                        }, []),
                },
            },
        },
    }
}

/*function isInTile(x: number, y: number, extent: number): boolean {
    return 0 < x && 0 < y && x < extent && y < extent
}

function clipLine(
    xStart: number,
    yStart: number,
    xEnd: number,
    yEnd: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
): { start: { x: number; y: number }; end: { x: number; y: number } } | undefined {
    const slope = (yEnd - yStart) / (xEnd - xStart)
    const yOffset = yStart - slope * xStart
    const start = clipPointOnLine(slope, yOffset, xStart, yStart, minX, minY, maxX, maxY)
    const end = clipPointOnLine(slope, yOffset, xEnd, yEnd, minX, minY, maxX, maxY)
    if (start == null || end == null) {
        return undefined
    }
    return {
        start,
        end,
    }
}

function clipPointOnLine(
    slope: number,
    yOffset: number,
    x: number,
    y: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
): { x: number; y: number } | undefined {
    if (pointIsInside(x, y, minX, minY, maxX, maxY)) {
        return { x, y }
    }

    const y1 = clip(y, minY, maxY)
    const x1 = calculateX(y1, slope, yOffset)
    if (pointIsInside(x1, y1, minX, minY, maxX, maxY)) {
        return { x: x1, y: y1 }
    }

    const x2 = clip(x, minX, maxX)
    const y2 = calculateY(x2, slope, yOffset)

    if (pointIsInside(x2, y2, minX, minY, maxX, maxY)) {
        return { x: x2, y: y2 }
    }

    return undefined
}

function calculateX(y: number, slope: number, yOffset: number): number {
    return (y - yOffset) / slope
}

function calculateY(x: number, slope: number, yOffset: number): number {
    return x * slope + yOffset
}

function clip(v: number, min: number, max: number): number {
    return Math.max(Math.min(v, max), min)
}

function pointIsInside(x: number, y: number, minX: number, minY: number, maxX: number, maxY: number): boolean {
    return minX <= x && minY <= y && x <= maxX && y <= maxY
}*/

function convertPolygonStreetToDescription(polygon: Layers[string][number]["geometry"][number]): NestedTransformation {
    return {
        type: "sequential",
        children: [
            {
                type: "operation",
                identifier: "pathwayFrom",
                children: [
                    {
                        type: "raw",
                        value: polygon[0].x,
                    },
                    {
                        type: "raw",
                        value: polygon[0].y,
                    },
                ],
            },
            ...polygon
                .slice(1)
                .map<NestedTransformation | undefined>(({ x, y }, i) => {
                    return {
                        type: "operation",
                        identifier: "pathwayTo",
                        children: [
                            {
                                type: "raw",
                                value: x,
                            },
                            {
                                type: "raw",
                                value: y,
                            },
                        ],
                    }
                })
                .filter(filterNull),
        ],
    }
}

export function convertLotsToDescriptions(layers: Layers): NestedDescriptions {
    const descriptions: NestedDescriptions = {}
    for (let i = 0; i < layers["building"].length; i++) {
        const feature = layers["building"][i]
        const transformations = feature.geometry.map((polygon) => convertPolygonLotToSteps(polygon)).filter(filterNull)
        if (transformations.length === 0) {
            continue
        }
        descriptions[`Building-${i}`] = {
            initialVariables: { type: "building" },
            nouns: {
                Start: {
                    transformation: {
                        type: "sequential",
                        children: [
                            transformations.length === 1
                                ? transformations[0]
                                : {
                                      type: "parallel",
                                      children: transformations,
                                  },
                            { type: "nounReference", nounIdentifier: "Building", descriptionIdentifier: "Default" },
                        ],
                    },
                },
            },
            rootNounIdentifier: "Start",
        }
    }
    return descriptions
}

function convertPolygonLotToSteps(
    geometry: Layers[string][number]["geometry"][number]
): NestedTransformation | undefined {
    const children = new Array<NestedTransformation>(geometry.length - 1)
    for (let i = 0; i < geometry.length - 1; i++) {
        const { x, y } = geometry[i]
        children[i] = {
            type: "operation",
            identifier: "point2",
            children: [
                {
                    type: "raw",
                    value: x,
                },
                {
                    type: "raw",
                    value: y,
                },
            ],
        }
    }
    return {
        type: "operation",
        identifier: "face",
        children,
    }
}
