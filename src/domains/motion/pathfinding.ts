import { BufferGeometry, Vector3 } from "three"
//@ts-ignore
import { Pathfinding } from "three-pathfinding"
import { Queue } from "../../interpreter/queue.js"
import { isPathway, pathwaysToGeometry } from "../pathway/index.js"
import { Keyframe } from "./index.js"

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
): Array<Vector3> {
    const pathfinding = getPathfinding(queue, type, radius)
    const groupId = pathfinding.getGroup(ZONE, toHelper.set(x, y, z))
    const { centroid } = pathfinding.getClosestNode(toHelper, ZONE, groupId)
    return pathfinding.findPath(fromHelper.set(from.x, from.y, from.z), centroid, ZONE, groupId)
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
