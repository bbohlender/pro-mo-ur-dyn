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

export function randomPointOn(
    queue: Queue,
    type: string,
    radius: number,
    seed: string,
    target = new Vector3()
): boolean {
    const pathfinding = getPathfinding(queue, type, radius)
    if (pathfinding == null) {
        return false
    }
    let clostestDistance: number | undefined
    let closestGroupId: number | undefined
    for (let groupId = 0; groupId < pathfinding.zones[ZONE].groups.length; groupId++) {
        const { centroid } = pathfinding.getClosestNode(fromHelper, ZONE, groupId)
        const distance = fromHelper.distanceTo(centroid)
        if (clostestDistance == null || distance < clostestDistance) {
            clostestDistance = distance
            closestGroupId = groupId
        }
    }
    if (closestGroupId == null) {
        return false
    }
    const group: Array<{ centroid: Vector3 }> = pathfinding.zones[ZONE].groups[closestGroupId]
    let selectedIndex = Math.floor(group.length * cyrb53Random(seed))
    target.copy(group[selectedIndex].centroid)
    return true
}

function getPathfinding(
    queue: Queue,
    type: string,
    radius: number
):
    | {
          findPath: Function
          getClosestNode: Function
          zones: { [key: string]: { groups: Array<Array<{ centroid: Vector3 }>> } }
      }
    | undefined {
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
