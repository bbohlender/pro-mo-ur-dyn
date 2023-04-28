import { Vector3, Shape, ShapeGeometry, BufferGeometry, Vector2 } from "three"
import { filterNull } from "../../util.js"
import { invertWinding, swapYZ } from "../building/primitive.js"
import { Pathway } from "./index.js"
import { mergeBufferGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js"

const vectorHelper = new Vector3()

function addConnectionToGraph(connectionsList: Array<Array<number>>, i1: number, i2: number): void {
    if (i1 === i2) {
        return
    }
    let connections = connectionsList[i1]
    if (connections == null) {
        connections = []
        connectionsList[i1] = connections
    }
    connections.push(i2)
}

const YUP = new Vector3(0, 1, 0)

export function createGraph(pathways: Array<Pathway>, type: string, normal: Vector3 = YUP, threshold = 3): Graph {
    const points: Array<{ position: Vector3; size: number }> = []
    const connectionsList: Array<Array<number>> = []
    for (const pathway of pathways) {
        if(pathway.type != type) {
            continue
        }
        const p1 = new Vector3(pathway.points[0].x, 0, pathway.points[0].y)
        let prevIndex = getIndexInPoints(points, p1, pathway.points[0].size)
        for (let i = 1; i < pathway.points.length; i++) {
            const p2 = new Vector3(pathway.points[i].x, 0, pathway.points[i].y)
            const currentIndex = getIndexInPoints(points, p2, pathway.points[i].size)
            addConnectionToGraph(connectionsList, prevIndex, currentIndex)
            addConnectionToGraph(connectionsList, currentIndex, prevIndex)
            prevIndex = currentIndex
        }
    }
    for (let i = 0; i < connectionsList.length; i++) {
        const connections = connectionsList[i]
        const sortedAngles = connections
            .slice(1)
            .map((index) => ({
                index,
                angle: degreeBetween(
                    points[i].position,
                    points[connections[0]].position,
                    points[index].position,
                    normal
                ),
            }))
            .sort((e1, e2) => e1.angle - e2.angle)
        connectionsList[i] = [connections[0], ...sortedAngles.map(({ index }) => index)]
    }
    return {
        connectionsList,
        points,
    }
}

function getIndexInPoints(points: Array<{ position: Vector3; size: number }>, position: Vector3, size: number) {
    let index = points.findIndex((p) => vectorHelper.copy(p.position).sub(position).length() * 2 < p.size + size)
    if (index === -1) {
        index = points.length
        points.push({ position, size })
    }
    return index
}

type Graph = {
    points: Array<{ position: Vector3; size: number }>
    connectionsList: Array<Array<number> | undefined>
}

function fromV3({ x, z }: Vector3, to: Vector2): Vector2 {
    return to.set(x, z)
}

const centerHelper = new Vector2()
const fromHelper = new Vector2()
const toHelper = new Vector2()

export function expandGraph(graph: Graph, normal: Vector3 = YUP): BufferGeometry | null {
    if (graph.points.length === 0) {
        return null
    }
    const visited = new Set<string>()
    const g = mergeBufferGeometries(
        graph.connectionsList
            .map<BufferGeometry | undefined>((otherPointIndicies, pointIndex) => {
                if (otherPointIndicies == null || otherPointIndicies.length < 3) {
                    return undefined
                }
                const center = graph.points[pointIndex]
                fromV3(center.position, centerHelper)
                const shape = new Shape(
                    otherPointIndicies
                        .map((otherPointIndex, i) => {
                            const result = new Vector2()
                            const nextPointIndex = otherPointIndicies[(i + 1) % otherPointIndicies.length]
                            const from = graph.points[otherPointIndex]
                            const to = graph.points[nextPointIndex]
                            return computeStreetBoundaryIntersection(
                                centerHelper,
                                center.size,
                                fromV3(from.position, fromHelper),
                                from.size,
                                fromV3(to.position, toHelper),
                                to.size,
                                result
                            )
                        })
                        .filter(filterNull)
                )
                const geometry = new ShapeGeometry(shape)
                swapYZ(geometry)
                invertWinding(geometry)
                return geometry
            })
            .filter(filterNull)
            .concat(
                graph.connectionsList.reduce<Array<BufferGeometry>>((prev, connections, pointIndex) => {
                    if (connections != null) {
                        prev.push(
                            ...connections
                                .map((otherPointIndex, toConnectionIndex) => {
                                    const key1 = `${otherPointIndex}/${pointIndex}`
                                    const key2 = `${pointIndex}/${otherPointIndex}`
                                    if (visited.has(key1) || visited.has(key2)) {
                                        return undefined
                                    }
                                    visited.add(key1)
                                    const otherConnections = graph.connectionsList[otherPointIndex]!
                                    const otherToConnectionIndex = otherConnections.findIndex(
                                        (pIndex) => pointIndex === pIndex
                                    )
                                    const shape = new Shape([
                                        ...streetStartPoints(graph.points, pointIndex, toConnectionIndex, connections),
                                        ...streetStartPoints(
                                            graph.points,
                                            otherPointIndex,
                                            otherToConnectionIndex,
                                            otherConnections
                                        ),
                                    ])
                                    const geometry = new ShapeGeometry(shape)
                                    swapYZ(geometry)
                                    invertWinding(geometry)
                                    return geometry
                                })
                                .filter(filterNull)
                        )
                    }
                    return prev
                }, [])
            )
    )
    delete g.attributes.uv
    return mergeVertices(g.toNonIndexed(), 0.1)
}

function streetStartPoints(
    points: Array<{ position: Vector3; size: number }>,
    fromPointIndex: number,
    toConnectionIndex: number,
    connections: Array<number>
): Array<Vector2> {
    const center = points[fromPointIndex]
    fromV3(center.position, centerHelper)
    const otherPointIndex = connections[toConnectionIndex]
    const otherPoint = points[otherPointIndex]

    if (connections.length < 2) {
        return [
            createStreetCorner(centerHelper, center.size, fromV3(otherPoint.position, fromHelper), true),
            createStreetCorner(centerHelper, center.size, fromV3(otherPoint.position, fromHelper), false),
        ]
    }

    const prevOtherPointIndex = connections[(toConnectionIndex - 1 + connections.length) % connections.length]
    const nextOtherPointIndex = connections[(toConnectionIndex + 1) % connections.length]

    const prevOtherPoint = points[prevOtherPointIndex]
    const nextOtherPoint = points[nextOtherPointIndex]

    return [
        computeStreetBoundaryIntersection(
            centerHelper,
            center.size,
            fromV3(prevOtherPoint.position, toHelper),
            prevOtherPoint.size,
            fromV3(otherPoint.position, fromHelper),
            otherPoint.size,
            new Vector2()
        ),
        computeStreetBoundaryIntersection(
            centerHelper,
            center.size,
            fromV3(otherPoint.position, fromHelper),
            otherPoint.size,
            fromV3(nextOtherPoint.position, toHelper),
            nextOtherPoint.size,
            new Vector2()
        ),
    ]
}

/*
const tangentHelper = new Vector2()
const helper2d = new Vector2()

export function generateStreet(p1: Vector2, s1: number, p2: Vector2, s2: number): Shape {
    tangentHelper.copy(p1).sub(p2)

    const x = new Vector2()
    calculateIntersection(new Vector2(0, 0), new Vector2(0, 0.5), new Vector2(1, 1), new Vector2(-0.5, 1), x)

    //rotate right
    const tmp = tangentHelper.x
    tangentHelper.x = -tangentHelper.y
    tangentHelper.y = tmp
    tangentHelper.normalize()

    const shape = new Shape()

    helper2d.copy(tangentHelper).multiplyScalar(s1).add(p1)
    shape.moveTo(helper2d.x, helper2d.y)

    helper2d.copy(tangentHelper).multiplyScalar(s1).negate().add(p1)
    shape.lineTo(helper2d.x, helper2d.y)

    helper2d.copy(tangentHelper).multiplyScalar(s1).negate().add(p2)
    shape.lineTo(helper2d.x, helper2d.y)

    helper2d.copy(tangentHelper).multiplyScalar(s1).add(p2)
    shape.lineTo(helper2d.x, helper2d.y)

    return shape
}*/

const p1 = new Vector2()
const p2 = new Vector2()
const p3 = new Vector2()
const p4 = new Vector2()

function computeStreetBoundaryIntersection(
    centerPoint: Vector2,
    centerSize: number,
    fromPoint: Vector2,
    fromSize: number,
    toPoint: Vector2,
    toSize: number,
    target: Vector2
): Vector2 {
    calculateStreetBoundary(centerPoint, centerSize, fromPoint, fromSize, false, p1, p2)
    calculateStreetBoundary(centerPoint, centerSize, toPoint, toSize, true, p3, p4)
    if (!calculateIntersection(p1, p2, p3, p4, target)) {
        target.copy(p1)
    }
    return target
}

const tangentHelper = new Vector2()

function createStreetCorner(p1: Vector2, size: number, p2: Vector2, left: boolean, target = new Vector2()): Vector2 {
    target.copy(p1).sub(p2)

    const tmp = target.x
    target.x = -target.y
    target.y = tmp
    target.normalize()

    if (left) {
        target.negate()
    }

    return target.multiplyScalar(size / 2).add(p1)
}

function calculateStreetBoundary(
    p1: Vector2,
    s1: number,
    p2: Vector2,
    s2: number,
    left: boolean,
    target1: Vector2,
    target2: Vector2
): void {
    tangentHelper.copy(p1).sub(p2)

    const tmp = tangentHelper.x
    tangentHelper.x = -tangentHelper.y
    tangentHelper.y = tmp
    tangentHelper.normalize()

    if (left) {
        tangentHelper.negate()
    }

    target1
        .copy(tangentHelper)
        .multiplyScalar(s1 / 2)
        .add(p1)

    target2
        .copy(tangentHelper)
        .multiplyScalar(s2 / 2)
        .add(p2)
}

function calculateIntersection(p1: Vector2, p2: Vector2, p3: Vector2, p4: Vector2, target: Vector2): boolean {
    const c2x = p3.x - p4.x // (x3 - x4)
    const c3x = p1.x - p2.x // (x1 - x2)
    const c2y = p3.y - p4.y // (y3 - y4)
    const c3y = p1.y - p2.y // (y1 - y2)

    // down part of intersection point formula
    const d = c3x * c2y - c3y * c2x

    if (d == 0) {
        return false
    }

    // upper part of intersection point formula
    const u1 = p1.x * p2.y - p1.y * p2.x // (x1 * y2 - y1 * x2)
    const u4 = p3.x * p4.y - p3.y * p4.x // (x3 * y4 - y3 * x4)

    // intersection point formula

    target.x = (u1 * c2x - c3x * u4) / d
    target.y = (u1 * c2y - c3y * u4) / d

    return true
}
/*

export function generateFaces(
    graph: Graph,
    pointIndex: number,
    connections: Array<number>,
    connectionIndex: number,
    distance: Array<number> | number,
    offset: Array<number> | number,
    normal: Vector3
): BufferGeometry {
    const otherPointIndex = connections[connectionIndex]
    const shape = new Shape()
    const matrix = new Matrix4()
    const currentPoint = graph.points[pointIndex]
    const nextPoint = graph.points[otherPointIndex]
    vectorHelper.copy(nextPoint).sub(currentPoint).setY(0).normalize()
    matrix.makeBasis(vectorHelper, YAXIS, new Vector3().crossVectors(vectorHelper, YAXIS))
    matrix.premultiply(makeTranslationMatrix(currentPoint.x, currentPoint.y, currentPoint.z))

    globalToLocal.copy(matrix).invert()
    drawTriangle(
        graph,
        shape,
        globalToLocal,
        Array.isArray(distance) ? distance[pointIndex] : distance,
        currentPoint,
        nextPoint,
        normal,
        connectionIndex,
        connections,
        true
    )
    const otherConnections = graph.connectionsList[otherPointIndex]
    const indexOfConnectionToPoint = otherConnections?.indexOf(pointIndex)
    drawTriangle(
        graph,
        shape,
        globalToLocal,
        Array.isArray(distance) ? distance[otherPointIndex] : distance,
        nextPoint,
        currentPoint,
        normal,
        indexOfConnectionToPoint,
        otherConnections,
        false
    )
    const geometry = new ShapeGeometry(shape)
    swapYZ(geometry)
    geometry.applyMatrix4(matrix)
    return geometry
}

const v1 = new Vector3()
const v2 = new Vector3()
const v3 = new Vector3()

const otherOriginToOriginNormal = new Vector3()
const originToSuccessorConnectionNormal = new Vector3()
const originToPredecessorConnectionNormal = new Vector3()

function drawTriangle(
    graph: Graph,
    shape: Shape,
    globalToLocal: Matrix4,
    distance: number,
    origin: Vector3,
    otherOrigin: Vector3,
    normal: Vector3,
    i: number | undefined,
    connections: Array<number> | undefined,
    initial: boolean
) {
    v2.copy(origin).applyMatrix4(globalToLocal)
    if (i != null && connections != null && connections.length > 1) {
        otherOriginToOriginNormal.copy(otherOrigin).sub(origin).normalize()

        originToSuccessorConnectionNormal
            .copy(graph.points[connections[(i + connections.length - 1) % connections.length]])
            .sub(origin)
            .normalize()

        v1.copy(otherOriginToOriginNormal).add(originToSuccessorConnectionNormal).normalize().multiplyScalar(distance)

        if (connections.length === 2) {
            originToPredecessorConnectionNormal.copy(originToSuccessorConnectionNormal)
            v3.copy(v1)
        } else {
            originToPredecessorConnectionNormal
                .copy(graph.points[connections[(i + 1) % connections.length]])
                .sub(origin)
                .normalize()

            v3.copy(otherOriginToOriginNormal)
                .add(originToPredecessorConnectionNormal)
                .normalize()
                .multiplyScalar(distance)
        }

        vectorHelper.crossVectors(otherOriginToOriginNormal, normal)

        const successorClockwise = vectorHelper.dot(originToSuccessorConnectionNormal) >= 0
        if (!successorClockwise) {
            v1.multiplyScalar(-1)
        }

        const predecessorClockwise = vectorHelper.dot(originToPredecessorConnectionNormal) >= 0
        if (predecessorClockwise) {
            v3.multiplyScalar(-1)
        }
    } else {
        v1.copy(otherOrigin).sub(origin).cross(normal).normalize().multiplyScalar(distance)
        v3.copy(v1).multiplyScalar(-1)
    }

    v1.add(origin).applyMatrix4(globalToLocal)
    v3.add(origin).applyMatrix4(globalToLocal)

    if (initial) {
        shape.moveTo(v1.x, v1.z)
    } else {
        shape.lineTo(v1.x, v1.z)
    }
    shape.lineTo(v2.x, v2.z)
    shape.lineTo(v3.x, v3.z)
}*/

const v1 = new Vector3()
const v2 = new Vector3()
const v3 = new Vector3()

function degreeBetween(targetPoint: Vector3, p1: Vector3, p2: Vector3, normal: Vector3): number {
    v1.copy(p1).sub(targetPoint)
    v2.copy(p2).sub(targetPoint)
    const cw = v3.crossVectors(v1, normal).dot(v2) < 0
    v1.projectOnPlane(normal)
    v2.projectOnPlane(normal)
    const angle = v1.angleTo(v2)
    return cw ? angle : Math.PI * 2 - angle
}
