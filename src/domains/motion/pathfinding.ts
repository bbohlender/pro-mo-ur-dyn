import { BufferGeometry } from "three"
//@ts-ignore
import { Pathfinding } from "three-pathfinding"
import { generateUUID } from "three/src/math/MathUtils.js"

const pathfinding = new Pathfinding()

export function createZone(geometry: BufferGeometry): string {
    const zoneId = generateUUID()
    const zone = Pathfinding.createZone(geometry)
    pathfinding.setZoneData(zoneId, zone)
    return zoneId
}


