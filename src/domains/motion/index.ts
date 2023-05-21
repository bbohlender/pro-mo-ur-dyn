import { Quaternion, Vector3, Vector3Tuple, Vector4Tuple } from "three"
import { OperationNextCallback, Operations } from "../../interpreter/index.js"
import { angleBetween, getEntityPositionAt, getEntityRotationAt, getKeyframeIndex } from "./helper.js"
import { Queue } from "../../interpreter/queue.js"
import { findPathTo, randomPointOn } from "./pathfinding.js"
import { NestedTransformation, filterNull } from "../../index.js"

const TIME_STEP = 0.1 //ms
export const rotationSpeed = 0.7 //radians / s

export const entityTypeDefaults = {
    pedestrian: {
        url: "models/human",
        radius: 1,
        speed: 1.5,
    },
    car: {
        url: "models/car",
        speed: 10,
        radius: 3,
    },
    bus: {
        url: "models/bus",
        speed: 7,
        radius: 5,
    },
    train: {
        url: "models/train",
        speed: 17,
        radius: 5,
    },
    cyclist: {
        url: "models/cyclist",
        radius: 2,
        speed: 3.5,
    },
    camera: {
        url: undefined,
        radius: 0,
        speed: 5,
    },
}

const positionHelper = new Vector3()

export function distanceTo(dx: number, dy: number, dz: number) {
    const squared = dx * dx + dy * dy + dz * dz
    if (squared === 0) {
        return 0
    }
    return Math.sqrt(squared)
}

export const operations: Operations = {
    follow: {
        defaultParameters: [],
        includeThis: true,
        includeQueue: true,
        execute: (
            next: OperationNextCallback,
            astId: string,
            seed: string,
            entity: MotionEntity,
            queue: Queue,
            targetId: string,
            offsetX = 0,
            offsetY = 0,
            offsetZ = 0
        ) => {
            //find target
            const target: MotionEntity | undefined =
                queue.list.find(({ id, value }) => id === targetId && isMotionEntity(value.raw))?.value?.raw ??
                queue.results.find(({ id, raw }) => id === targetId && isMotionEntity(raw))?.raw

            const nextFollowTransformation: NestedTransformation = {
                type: "precomputedOperation",
                identifier: "follow",
                astId,
                parameters: [targetId, offsetX, offsetY, offsetZ],
            }

            if (target == null) {
                return next(
                    entity,
                    {
                        type: "precomputedOperation",
                        astId,
                        identifier: "wait",
                        parameters: [0.01],
                    },
                    nextFollowTransformation
                )
            }

            entity.keyframes.splice(-1, 1)
            const { speed, t: currentTime } = entity.keyframes[entity.keyframes.length - 1]

            //add all missing keyframes to this target with a very small delay (+ 0.01) and with the astId
            for (const keyframe of target.keyframes) {
                if (keyframe.t < currentTime) {
                    continue
                }
                positionHelper
                    .set(...keyframe.position)
                    .add(
                        deltaHelper
                            .set(offsetX, offsetY, offsetZ)
                            .applyQuaternion(quaternionHelper.set(...keyframe.rotation))
                    )
                entity.keyframes.push({
                    astId,
                    speed,
                    t: keyframe.t + 0.01,
                    position: positionHelper.toArray(),
                    rotation: keyframe.rotation,
                })
            }

            const latestTime = entity.keyframes[entity.keyframes.length - 1].t

            if (latestTime === currentTime) {
                return next(
                    entity,
                    {
                        type: "precomputedOperation",
                        astId,
                        identifier: "wait",
                        parameters: [0.01],
                    },
                    nextFollowTransformation
                )
            }

            return next(entity, nextFollowTransformation)
        },
    },
    moveTo: {
        defaultParameters: [],
        includeThis: true,
        includeQueue: false,
        execute: (
            next: OperationNextCallback,
            astId: string,
            seed: string,
            entity: MotionEntity,
            x: number,
            y: number,
            z: number,
            deltaT?: number
        ) => {
            const { position, t, speed } = entity.keyframes[entity.keyframes.length - 1]
            const [currentX, currentY, currentZ] = position
            const dt = deltaT ?? distanceTo(currentX - x, currentY - y, currentZ - z) / speed
            const nextPosition: Vector3Tuple = [x, y, z]
            entity.keyframes.push({
                position: nextPosition,
                rotation: computeRotationFromKeyframes(
                    position,
                    nextPosition,
                    quaternionHelper
                ).toArray() as Vector4Tuple,
                t: t + Math.max(0.01, dt),
                astId,
                speed,
            })
            return next(entity)
        },
    },
    speed: {
        defaultParameters: [],
        includeThis: true,
        includeQueue: false,
        execute: (next, astId, seed, entity: MotionEntity, speed: number) => {
            entity.keyframes[entity.keyframes.length - 1].speed = speed
            return next(entity)
        },
    },
    later: {
        defaultParameters: [],
        includeQueue: false,
        execute: (next, astId, seed, entity: MotionEntity, t: number) => {
            entity.keyframes[entity.keyframes.length - 1].t += t
            return next(entity)
        },
        includeThis: true,
    },
    clone: {
        defaultParameters: [],
        includeQueue: false,
        execute: (next, astId, seed, entity: MotionEntity, amount: number) => {
            return next(new Array(amount).fill(null).map(() => structuredClone(entity)))
        },
        includeThis: true,
    },
    randomPointOn: {
        defaultParameters: [],
        execute: (next, astId, seed: string, entity: MotionEntity, queue: Queue, type: string) => {
            if (
                !randomPointOn(
                    queue,
                    type,
                    entity.radius,
                    seed + entity.keyframes[entity.keyframes.length - 1].t,
                    positionHelper
                )
            ) {
                return next(undefined)
            }
            return next({ x: positionHelper.x, y: positionHelper.y, z: positionHelper.z })
        },
        includeQueue: true,
        includeThis: true,
    },
    pathOnToAndDodge: {
        defaultParameters: [],
        execute: (
            next,
            astId,
            seed,
            entity: MotionEntity,
            queue: Queue,
            type: string,
            target: { x: number; y: number; z: number } | undefined
        ) => {
            const wait1Sec: NestedTransformation = {
                type: "precomputedOperation",
                identifier: "wait",
                astId,
                parameters: [1],
            }
            if (target == null) {
                return next(wait1Sec)
            }
            const keyframe = entity.keyframes[entity.keyframes.length - 1]
            vectorHelper1.set(...keyframe.position)
            let path = findPathTo(queue, type, entity.radius, keyframe, target.x, target.y, target.z)
            path = path?.filter((position, i) => position.distanceTo(i === 0 ? vectorHelper1 : path![i - 1]) > 0.01)
            if (path != null && path.length > 0) {
                return next(
                    entity,
                    ...path.map<NestedTransformation>(({ x, y, z }) => ({
                        type: "precomputedOperation",
                        identifier: "moveToAndDodge",
                        parameters: [x, y, z],
                        astId,
                    }))
                )
            }
            return next(entity, wait1Sec)
        },
        includeQueue: true,
        includeThis: true,
    },
    pathOnTo: {
        defaultParameters: [],
        execute: (
            next,
            astId,
            seed,
            entity: MotionEntity,
            queue: Queue,
            type: string,
            target: { x: number; y: number; z: number } | undefined
        ) => {
            const wait1Sec: NestedTransformation = {
                type: "precomputedOperation",
                identifier: "wait",
                astId,
                parameters: [1],
            }
            if (target == null) {
                return next(entity, wait1Sec)
            }
            const keyframe = entity.keyframes[entity.keyframes.length - 1]
            vectorHelper1.set(...keyframe.position)
            let path = findPathTo(queue, type, entity.radius, keyframe, target.x, target.y, target.z)
            path = path?.filter((position, i) => position.distanceTo(i === 0 ? vectorHelper1 : path![i - 1]) > 0.01)
            if (path != null && path.length > 0) {
                return next(
                    entity,
                    ...path.map<NestedTransformation>(({ x, y, z }) => ({
                        type: "precomputedOperation",
                        identifier: "moveTo",
                        parameters: [x, y, z],
                        astId,
                    }))
                )
            }
            return next(entity, wait1Sec)
        },
        includeQueue: true,
        includeThis: true,
    },
    spawnOn: {
        defaultParameters: [],
        execute: (next, astId, seed, entity: MotionEntity, queue: Queue, type = "street", amount = 1) => {
            const environment = queue.list.map(({ value: { raw } }) => raw).concat(queue.results.map(({ raw }) => raw))
            const keyframe = entity.keyframes[entity.keyframes.length - 1]
            let i = 0
            const points: Array<Vector3Tuple> = []

            outer: for (let x = 0; x < amount; x++) {
                do {
                    if (i > 10000) {
                        break outer
                    }
                    if (!randomPointOn(queue, type, entity.radius, seed + keyframe.t + i, vectorHelper1)) {
                        break outer
                    }
                    i++
                } while (
                    hasCollisionWithOtherSimilarEntities(vectorHelper1, entity.radius, points) ||
                    hasCollisionWithAnyOtherEntitiy(vectorHelper1, entity, environment, keyframe.t)
                )
                points.push(vectorHelper1.toArray())
            }
            return next(
                points.map((position) => ({
                    keyframes: [
                        {
                            position,
                            rotation: defaultRotation,
                            astId,
                            t: keyframe.t,
                            speed: keyframe.speed,
                        },
                    ],
                    type: entity.type,
                    radius: entity.radius,
                    url: entity.url,
                    id: "",
                }))
            )
        },
        includeQueue: true,
        includeThis: true,
    },
    wait: {
        defaultParameters: [],
        includeQueue: false,
        execute: (next, astId, seed, entity: MotionEntity, t: number) => {
            const { position, rotation, t: oldT, speed } = entity.keyframes[entity.keyframes.length - 1]
            entity.keyframes.push({
                astId,
                position,
                rotation,
                t: oldT + t,
                speed,
            })
            return next(entity)
        },
        includeThis: true,
    },
    moveBy: {
        defaultParameters: [],
        includeThis: true,
        includeQueue: false,
        execute: (
            next: OperationNextCallback,
            astId: string,
            seed: string,
            entity: MotionEntity,
            dx: number,
            dy: number,
            dz: number
        ) => {
            const { position, t, speed } = entity.keyframes[entity.keyframes.length - 1]
            const dt = distanceTo(dx, dy, dz) / speed
            const nextPosition: Vector3Tuple = [position[0] + dx, position[1] + dy, position[2] + dz]
            entity.keyframes.push({
                position: nextPosition,
                rotation: computeRotationFromKeyframes(
                    position,
                    nextPosition,
                    quaternionHelper
                ).toArray() as Vector4Tuple,
                t: t + dt,
                astId,
                speed,
            })
            return next(entity)
        },
    },
    moveToAndDodge: {
        defaultParameters: [],
        includeThis: true,
        includeQueue: true,
        execute: (
            next: OperationNextCallback,
            astId: string,
            seed: string,
            entity: MotionEntity,
            queue: Queue,
            targetX: number,
            targetY: number,
            targetZ: number
        ) => {
            const nextMoveToTransformation: NestedTransformation = {
                type: "precomputedOperation",
                identifier: "moveToAndDodge",
                parameters: [targetX, targetY, targetZ],
                astId,
            }
            const lastKeyframe = entity.keyframes[entity.keyframes.length - 1]
            const { position, rotation, speed, t } = lastKeyframe
            deltaHelper.set(targetX - position[0], targetY - position[1], targetZ - position[2])
            const fullDistanceLength = deltaHelper.length()
            const stepDistance = Math.min(TIME_STEP * speed, fullDistanceLength)
            //normalise and apply the step size
            if (fullDistanceLength === 0) {
                deltaHelper.set(0, 0, 0)
            } else {
                deltaHelper.multiplyScalar(stepDistance / fullDistanceLength)
            }

            const nextT = t + Math.max(0.01, stepDistance / speed)

            const environment = queue.list.map(({ value: { raw } }) => raw).concat(queue.results.map(({ raw }) => raw))

            nextPositionHelper.set(...position)
            nextQuaternionHelper.set(...rotation)

            const clostestEntity = getClostestEntity(entity, environment, nextPositionHelper, nextT)

            if (clostestEntity != null && clostestEntity.distance < entity.radius * 2) {
                const clostestEntityOnRightSide =
                    toRightHelper
                        .set(1, 0, 0)
                        .applyQuaternion(nextQuaternionHelper)
                        .dot(clostestEntity.directionVector) >= 0
                nextQuaternionHelper.multiply(clostestEntityOnRightSide ? toLeftRotation : toRightRotation)
                deltaHelper.set(0, 0, 1).multiplyScalar(stepDistance).applyQuaternion(nextQuaternionHelper)
                nextPositionHelper.add(deltaHelper)

                const clostestEntityAfter = getClostestEntity(entity, environment, nextPositionHelper, nextT)
                if (clostestEntityAfter != null && clostestEntityAfter.distance <= 0) {
                    nextPositionHelper.set(...position)
                }
            } else {
                //just go forward
                nextPositionHelper.add(deltaHelper)
                computeRotationFromKeyframes(position, nextPositionHelper, nextQuaternionHelper)
            }

            const nextPosition = nextPositionHelper.toArray()
            const nextRotation = nextQuaternionHelper.toArray() as Vector4Tuple

            if (angleBetween(rotation, nextRotation) > degToRadians(3)) {
                entity.keyframes.push({
                    position: nextPosition,
                    rotation: nextRotation,
                    t: nextT,
                    astId,
                    speed,
                })
            } else {
                nextPositionHelper.toArray(position)
                lastKeyframe.t = nextT
            }

            if (Math.abs(fullDistanceLength - stepDistance) < entity.radius) {
                return next(entity) //done
            }

            return next(entity, nextMoveToTransformation) //schedule again
        },
    },
}

function degToRadians(deg: number): number {
    return (deg / 180) * Math.PI
}

const YAXIS = new Vector3(0, 1, 0)
const toRightRotation = new Quaternion().setFromAxisAngle(YAXIS, rotationSpeed * TIME_STEP)
const toLeftRotation = toRightRotation.clone().invert()

const nextPositionHelper = new Vector3()
const nextQuaternionHelper = new Quaternion()
const deltaHelper = new Vector3()
const toRightHelper = new Vector3()

const directionHelper = new Vector3()

function getClostestEntity(entity: MotionEntity, environment: Array<any>, position: Vector3, time: number) {
    let result: { entity: MotionEntity; distance: number; directionVector: Vector3 } | undefined
    for (const value of environment) {
        if (value == entity || !isMotionEntity(value) || value.type === "camera") {
            continue
        }
        const index = getKeyframeIndex(value.keyframes, time, TIME_STEP + 0.001)
        if (index == null) {
            continue
        }
        getEntityPositionAt(value.keyframes, time, index, directionHelper)
        directionHelper.sub(position)
        let distance = directionHelper.length()
        directionHelper.divideScalar(distance)

        distance = Math.max(0, distance - entity.radius - value.radius)

        if (result == null) {
            result = { entity: value, distance, directionVector: directionHelper.clone() }
            continue
        }
        if (distance < result.distance) {
            result.distance = distance
            result.directionVector.copy(directionHelper)
            result.entity = value
        }
    }
    return result
}

const defaultRotation: Vector4Tuple = [0, 0, 0, 1]

const vectorHelper1 = new Vector3()
const vectorHelper2 = new Vector3()
const quaternionHelper = new Quaternion()

const ZAXIS = new Vector3(0, 0, 1)

function computeRotationFromKeyframes(
    p1: Vector3Tuple | Vector3,
    p2: Vector3Tuple | Vector3,
    target = new Quaternion()
): Quaternion {
    Array.isArray(p1) ? vectorHelper1.set(...p1) : vectorHelper1.copy(p1)
    Array.isArray(p2) ? vectorHelper2.set(...p2) : vectorHelper2.copy(p2)
    vectorHelper2.sub(vectorHelper1)
    vectorHelper2.normalize()
    target.setFromUnitVectors(ZAXIS, vectorHelper2)
    return target
}

function hasCollisionWithOtherSimilarEntities(
    position: Vector3,
    radius: number,
    otherPositions: Array<Vector3Tuple>
): boolean {
    const radiusTimes2 = radius * 2
    for (const otherPosition of otherPositions) {
        if (vectorHelper2.set(...otherPosition).distanceTo(position) < radiusTimes2) {
            return true
        }
    }
    return false
}

function hasCollisionWithAnyOtherEntitiy(
    position: Vector3,
    entity: MotionEntity,
    environment: Array<any>,
    time: number
): boolean {
    for (const value of environment) {
        if (value === entity || !isMotionEntity(value)) {
            continue
        }

        const index = getKeyframeIndex(value.keyframes, time, 0)
        if (index == null) {
            continue
        }
        getEntityPositionAt(value.keyframes, time, index, vectorHelper2)

        if (vectorHelper2.distanceTo(position) < entity.radius + value.radius) {
            return true
        }
    }
    return false
}

export function createMotionEntitiy({ type, x, y, z, time }: any, astId: string): MotionEntity {
    const defaults = entityTypeDefaults[(type ?? "pedestrian") as keyof typeof entityTypeDefaults]
    if (defaults == null) {
        throw new Error(`unknown type "${type}"`)
    }
    return {
        keyframes: [
            {
                position: [x ?? 0, y ?? 0, z ?? 0],
                t: time ?? 0,
                rotation: defaultRotation,
                astId,
                speed: defaults.speed,
            },
        ],
        radius: defaults.radius,
        url: defaults.url,
        type,
        id: "",
    }
}

export function getMotionEntityProgress(entity: MotionEntity) {
    return entity.keyframes[entity.keyframes.length - 1].t
}

export type MotionEntity = {
    keyframes: Array<Keyframe>
    url?: string
    radius: number
    id: string
    type: string
}

export type Keyframe = {
    t: number
    position: Vector3Tuple
    rotation: Vector4Tuple
    astId: string
    speed: number
}

export function isMotionEntity(value: unknown): value is MotionEntity {
    return typeof value === "object" && value != null && "keyframes" in value
}

export * from "./helper.js"
