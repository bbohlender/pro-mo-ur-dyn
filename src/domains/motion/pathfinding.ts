import { BufferGeometry, Vector3 } from "three"
//@ts-ignore
import { Pathfinding } from "three-pathfinding"
import { Queue } from "../../interpreter/queue.js"
import { isPathway, pathwaysToGeometry } from "../pathway/index.js"
import { Keyframe } from "./index.js"

const ZONE = "Default-Zone"

const fromHelper = new Vector3()
const toHelper = new Vector3()

export function findPathTo(queue: Queue, from: Keyframe, x: number, y: number, z: number): Array<Vector3> {
    const pathfinding = getPathfinding(queue)
    const groupId = pathfinding.getGroup(ZONE, toHelper.set(x, y, z))
    const { centroid } = pathfinding.getClosestNode(toHelper, ZONE, groupId)
    return pathfinding.findPath(fromHelper.set(from.x, from.y, from.z), centroid, ZONE, groupId)
}

function getPathfinding(queue: Queue): any {
    const geometry: BufferGeometry = (queue.resultCache.pathways =
        queue.resultCache.pathways ?? pathwaysToGeometry(queue.results.map(({ raw }) => raw).filter(isPathway)))
    if(queue.resultCache.pathfinding != null) {
        return queue.resultCache.pathfinding
    }
    const pathfinding = new Pathfinding()
    const zone = Pathfinding.createZone(geometry)
    pathfinding.setZoneData(ZONE, zone)
    return (queue.resultCache.pathfinding = pathfinding)
}
