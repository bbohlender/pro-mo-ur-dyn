import { Vector3, Vector4Tuple } from "three"

const helperVector = new Vector3()

/**
 * backwards search for position at time
 */
export function getEntityPositionAt(keyframes: Array<Vector4Tuple>, time: number, target: Vector3): boolean {
    if (keyframes.length === 0) {
        return false
    }
    let index = keyframes.length - 1
    while (index > 0 && keyframes[index][3] > time) {
        index--
    }
    if (keyframes[index][3] <= time && time <= keyframes[index + 1][3]) {
        const [x1, y1, z1, t1] = keyframes[index]
        helperVector.set(x1, y1, z1)
        const [x2, y2, z2, t2] = keyframes[index + 1]
        target.set(x2, y2, z2)
        const percent = (time - t1) / (t2 - t1)
        target.sub(helperVector).multiplyScalar(percent).add(helperVector)
        return true
    }
    return false
}
