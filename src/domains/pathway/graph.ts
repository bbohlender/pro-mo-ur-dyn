import { Vector3, Matrix4, Quaternion, Shape, Mesh, ShapeGeometry, MeshPhongMaterial, BackSide, MeshBasicMaterial } from "three"
import { filterNull } from "../../util.js"
import { makeTranslationMatrix } from "../building/math.js"
import { Primitive, FacePrimitive, swapYZ } from "../building/primitive.js"
import { Pathway } from "./index.js"

const vectorHelper = new Vector3()

function addConnectionToGraph(connectionsList: Array<Array<number>>, i1: number, i2: number): void {
    let connections = connectionsList[i1]
    if (connections == null) {
        connections = []
        connectionsList[i1] = connections
    }
    connections.push(i2)
}

const YUP = new Vector3(0, 1, 0)

export function createGraph(pathways: Array<Pathway>, normal: Vector3 = YUP, threshold = 10): Graph {
    const thresholdSquared = threshold * threshold
    const points: Array<Vector3> = []
    const connectionsList: Array<Array<number>> = []
    for (const pathway of pathways) {
        const p1 = new Vector3(pathway.points[0].x, 0, pathway.points[0].y)
        let prevIndex = getIndexInPoints(points, p1, thresholdSquared)
        for (let i = 1; i < pathway.points.length; i++) {
            const p2 = new Vector3(pathway.points[i].x, 0, pathway.points[i].y)
            const currentIndex = getIndexInPoints(points, p2, thresholdSquared)
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
                angle: degreeBetween(points[i], points[connections[0]], points[index], normal),
            }))
            .sort((e1, e2) => e1.angle - e2.angle)
        connectionsList[i] = [connections[0], ...sortedAngles.map(({ index }) => index)]
    }
    return {
        connectionsList,
        points,
    }
}

function getIndexInPoints(points: Array<Vector3>, point: Vector3, thresholdSquared: number) {
    let index = points.findIndex((p) => vectorHelper.copy(p).sub(point).lengthSq() < thresholdSquared)
    if (index === -1) {
        index = points.length
        points.push(point)
    }
    return index
}

type Graph = {
    points: Array<Vector3>
    connectionsList: Array<Array<number> | undefined>
}

export function expandGraph(graph: Graph, normal: Vector3 = YUP): Array<Mesh> {
    if (graph.points.length === 0) {
        return []
    }
    const visited = new Set<string>()
    return graph.connectionsList.reduce<Array<Mesh>>((prev, connections, pointIndex) => {
        if (connections == null) {
            return prev
        }
        return [
            ...prev,
            ...connections
                .map((otherPointIndex, connectionIndex) => {
                    const key1 = `${otherPointIndex}/${pointIndex}`
                    const key2 = `${pointIndex}/${otherPointIndex}`
                    if (visited.has(key1) || visited.has(key2)) {
                        return undefined
                    }
                    visited.add(key1)
                    return generateFaces(
                        graph,
                        pointIndex,
                        connections,
                        connectionIndex,
                        10 /*distance*/,
                        0 /*offset*/,
                        normal
                    )
                })
                .filter(filterNull),
        ]
    }, [])
}

const globalToLocal = new Matrix4()

export const XAXIS = new Vector3(1, 0, 0)
export const YAXIS = new Vector3(0, 1, 0)
export const ZAXIS = new Vector3(0, 0, 1)

export function generateFaces(
    graph: Graph,
    pointIndex: number,
    connections: Array<number>,
    connectionIndex: number,
    distance: Array<number> | number,
    offset: Array<number> | number,
    normal: Vector3
): Mesh {
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
    const mesh = new Mesh(geometry, new MeshPhongMaterial({ toneMapped: false, side: BackSide, color: "gray" }))
    matrix.decompose(mesh.position, mesh.quaternion, mesh.scale)
    return mesh
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
}

function degreeBetween(targetPoint: Vector3, p1: Vector3, p2: Vector3, normal: Vector3): number {
    v1.copy(p1).sub(targetPoint)
    v2.copy(p2).sub(targetPoint)
    const cw = v3.crossVectors(v1, normal).dot(v2) < 0
    v1.projectOnPlane(normal)
    v2.projectOnPlane(normal)
    const angle = v1.angleTo(v2)
    return cw ? angle : Math.PI * 2 - angle
}
