import { BufferGeometry, Vector3 } from "three"
//@ts-ignore
import { Pathfinding } from "three-pathfinding"
import { Queue } from "../../interpreter/queue.js"
import { isPathway, pathwaysToGeometry } from "../pathway/index.js"
import { Keyframe } from "./index.js"
import { cyrb53Random } from "../../util.js"

const ZONE = "Default-Zone"

const fromHelper = new Vector3()
const toHelper = new Vector3()

export function clampOnPath(queue: Queue, type: string, radius: number, from: Vector3, to: Vector3): void {
    const pathfinding = getPathfinding(queue, type, radius)
    if (pathfinding == null) {
        return
    }
    const groupId = getGroupId(queue, type, radius, from)
    const node = pathfinding.getClosestNode(from, ZONE, groupId)
    if (node == null) {
        return
    }
    pathfinding.clampStep(from, toHelper.copy(to), node, ZONE, groupId, to)
}

export function findPathTo(
    queue: Queue,
    type: string,
    radius: number,
    from: Keyframe,
    x: number,
    y: number,
    z: number
): Array<Vector3> | undefined {
    const pathfinding = getPathfinding(queue, type, radius)
    if (pathfinding == null) {
        return undefined
    }
    fromHelper.set(...from.position)
    let clostestCentroid: Vector3 | undefined
    let clostestDistance: number | undefined
    let closestGroupId: number | undefined
    for (let groupId = 0; groupId < pathfinding.zones[ZONE].groups.length; groupId++) {
        const { centroid } = pathfinding.getClosestNode(fromHelper, ZONE, groupId)
        const distance = fromHelper.distanceTo(centroid)
        if (clostestDistance == null || distance < clostestDistance) {
            clostestDistance = distance
            clostestCentroid = centroid
            closestGroupId = groupId
        }
    }
    if (clostestCentroid == null || closestGroupId == null) {
        return undefined
    }
    const { centroid: toCentroid } = pathfinding.getClosestNode(toHelper.set(x, y, z), ZONE, closestGroupId)
    return pathfinding.findPath(clostestCentroid, toCentroid, ZONE, closestGroupId)
}

export function getGroupId(queue: Queue, type: string, radius: number, from: Vector3): number | undefined {
    const pathfinding = getPathfinding(queue, type, radius)
    let clostestDistance: number | undefined
    let closestGroupId: number | undefined
    for (let groupId = 0; groupId < pathfinding.zones[ZONE].groups.length; groupId++) {
        const { centroid } = pathfinding.getClosestNode(from, ZONE, groupId)
        const distance = from.distanceTo(centroid)
        if (clostestDistance == null || distance < clostestDistance) {
            clostestDistance = distance
            closestGroupId = groupId
        }
    }
    return closestGroupId
}

export function randomPointOn(
    queue: Queue,
    type: string,
    radius: number,
    seed: string,
    target = new Vector3(),
    groupId?: number
): boolean {
    const pathfinding = getPathfinding(queue, type, radius)
    if (pathfinding == null) {
        return false
    }
    const zone = pathfinding.zones[ZONE] as { groups: Array<Array<{ centroid: Vector3 }>> }
    if (groupId == null) {
        groupId = Math.floor(zone.groups.length * cyrb53Random(seed + "groupId"))
    }
    const group: Array<{ centroid: Vector3 }> = zone.groups[groupId]
    const selectedIndex = Math.floor(group.length * cyrb53Random(seed))
    target.copy(group[selectedIndex].centroid)
    return true
}

export type Pathfinding = {
    findPath: Function
    getClosestNode: Function
    zones: { [key: string]: { groups: Array<Array<{ centroid: Vector3 }>> } }
}

function getPathfinding(queue: Queue, type: string, radius: number): Pathfinding | undefined {
    return queue.getCached(`${type}-pathfinding-radius-${radius}`, () => {
        const geometry = queue.getCached(`${type}-radius-${radius}`, (results) =>
            pathwaysToGeometry(results.map(({ raw }) => raw).filter(isPathway), type, radius * -2)
        )
        if (geometry == null) {
            return undefined
        }
        const pathfinding = new Pathfinding()
        const zone = Pathfinding.createZone(geometry)
        pathfinding.setZoneData(ZONE, zone)
        return pathfinding
    })
}
