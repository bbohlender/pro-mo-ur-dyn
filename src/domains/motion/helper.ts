import { Quaternion, Vector3, Vector4Tuple } from "three"
import { Keyframe, rotationSpeed } from "./index.js"

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
    const { position: p1, t: t1 } = keyframes[index]
    if (index + 1 >= keyframes.length) {
        target.set(...p1)
        return
    }
    helperVector1.set(...p1)
    const { position: p2, t: t2 } = keyframes[index + 1]
    target.set(...p2)
    const percent = (time - t1) / (t2 - t1)
    target.sub(helperVector1).multiplyScalar(percent).add(helperVector1)
}

const q1 = new Quaternion()
const q2 = new Quaternion()

export function getRotationPeriod(
    prevRotation: Vector4Tuple,
    prevTime: number,
    rotation: Vector4Tuple,
    time: number
): number {
    const prevAngle = Math.abs(angleBetween(prevRotation, rotation))
    return Math.min(prevAngle / rotationSpeed, time - prevTime)
}

export function getEntityRotationAt(keyframes: Array<Keyframe>, time: number, index: number, target: Quaternion): void {
    const { rotation, t } = keyframes[Math.min(index + 1, keyframes.length - 1)]

    const prevKeyframe = keyframes[index]
    const prevRotation = prevKeyframe.rotation
    const prevTime = prevKeyframe.t
    const currentPeriod = time - prevTime

    const rotationPeriod = getRotationPeriod(prevRotation, prevTime, rotation, t)

    if (index === 0 || currentPeriod >= rotationPeriod) {
        target.set(...rotation)
        return
    }

    target.set(...prevRotation)
    q2.set(...rotation)
    target.slerp(q2, currentPeriod / rotationPeriod)
}

export function angleBetween(a1: Vector4Tuple, a2: Vector4Tuple): number {
    q1.set(...a1)
    q2.set(...a2)
    return q1.angleTo(q2)
}
