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
    const groupId = pathfinding.getGroup(ZONE, toHelper.set(x, y, z))
    return pathfinding.findPath(fromHelper.set(...from.position), toHelper, ZONE, groupId)
}

export function randomPointOn(queue: Queue, type: string, radius: number, seed: string): Vector3 {
    console.log(seed)
    const pathfinding = getPathfinding(queue, type, radius)
    const groups: Array<Array<{ centroid: Vector3 }>> = pathfinding.zones[ZONE].groups
    const allLength = groups.reduce((prev, g) => prev + g.length, 0)
    if (allLength == 0) {
        return new Vector3()
    }
    let selectedIndex = Math.floor(allLength * cyrb53Random( seed))
    let groupIndex = 0
    while (groupIndex < groups.length) {
        const groupLength = groups[groupIndex].length
        if (selectedIndex >= groupLength) {
            groupIndex++
            selectedIndex -= groupLength
            continue
        }
        return groups[groupIndex][selectedIndex].centroid.clone()
    }
    throw new Error(`selected index bigger all length`)
}

function getPathfinding(queue: Queue, type: string, radius: number): any {
    return queue.getCached(`${type}-pathfinding-radius-${radius}`, () => {
        const geometry = queue.getCached(`${type}-radius-${radius}`, (results) =>
            pathwaysToGeometry(results.map(({ raw }) => raw).filter(isPathway), type, radius * -2)
        )
        const pathfinding = new Pathfinding()
        const zone = Pathfinding.createZone(geometry)
        pathfinding.setZoneData(ZONE, zone)
        return pathfinding
    })
}
