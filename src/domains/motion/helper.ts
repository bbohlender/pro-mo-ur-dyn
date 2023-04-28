import { Quaternion, Vector3 } from "three"
import { Keyframe } from "./index.js"

const helperVector1 = new Vector3()
const helperVector2 = new Vector3()

export function getKeyframeIndex(keyframes: Array<Keyframe>, time: number, tolerance: number): number | undefined {
    if (keyframes.length === 0) {
        return undefined
    }
    if (keyframes.length === 1) {
        if (Math.abs(keyframes[0].t - time) >= tolerance) {
            return undefined
        }
        return 0
    }
    let index = keyframes.length - 2
    while (index > 0 && keyframes[index].t > time) {
        index--
    }
    if (keyframes[index].t <= time + tolerance && time - tolerance <= keyframes[index + 1].t) {
        return index
    }
    return undefined
}

/**
 * backwards search for position at time
 * @param tolerance specifies the maximum time difference between time and the max/min times from the keyframes
 * @returns false if the requested time lies outside the provided keyframes
 */
export function getEntityPositionAt(keyframes: Array<Keyframe>, time: number, index: number, target: Vector3): void {
    const { x: x1, y: y1, z: z1, t: t1 } = keyframes[index]
    if (keyframes.length === 1) {
        target.set(x1, y1, z1)
        return
    }
    helperVector1.set(x1, y1, z1)
    const { x: x2, y: y2, z: z2, t: t2 } = keyframes[index + 1]
    target.set(x2, y2, z2)
    const percent = (time - t1) / (t2 - t1)
    target.sub(helperVector1).multiplyScalar(percent).add(helperVector1)
}

const ZAXIS = new Vector3(0, 0, 1)

export function getEntityRotationAt(keyframes: Array<Keyframe>, time: number, index: number, target: Quaternion): void {
    if (keyframes.length === 1) {
        return
    }
    const { x: x1, y: y1, z: z1, t: t1 } = keyframes[index]
    helperVector1.set(x1, y1, z1)
    const { x: x2, y: y2, z: z2, t: t2 } = keyframes[index + 1]
    helperVector2.set(x2, y2, z2)
    helperVector2.sub(helperVector1).normalize()
    target.setFromUnitVectors(ZAXIS, helperVector2)
}
