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
    const groupId = 0
    fromHelper.set(...from.position)
    const { centroid: fromCentroid } = pathfinding.getClosestNode(fromHelper, ZONE, groupId)
    const { centroid: toCentroid } = pathfinding.getClosestNode(toHelper.set(x, y, z), ZONE, groupId)
    return pathfinding.findPath(fromCentroid, toCentroid, ZONE, groupId)
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
    const groups: Array<Array<{ centroid: Vector3 }>> = pathfinding.zones[ZONE].groups
    const allLength = groups.reduce((prev, g) => prev + g.length, 0)
    let selectedIndex = Math.floor(allLength * cyrb53Random(seed))
    let groupIndex = 0
    while (groupIndex < groups.length) {
        const groupLength = groups[groupIndex].length
        if (selectedIndex >= groupLength) {
            groupIndex++
            selectedIndex -= groupLength
            continue
        }
        target.copy(groups[groupIndex][selectedIndex].centroid)
        return true
    }
    return false
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
