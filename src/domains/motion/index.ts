import { Quaternion, Vector3, Vector3Tuple, Vector4Tuple } from "three"
import { OperationNextCallback, Operations } from "../../interpreter/index.js"
import { getEntityPositionAt, getEntityRotationAt, getKeyframeIndex } from "./helper.js"
import { Queue } from "../../interpreter/queue.js"
import { findPathTo, randomPointOn } from "./pathfinding.js"
import { NestedTransformation } from "../../index.js"

const TIME_STEP = 0.1 //ms

export const entityTypeDefaults = {
    pedestrian: {
        url: "models/human",
        radius: 1,
        speed: 1.5,
    },
    car: {
        url: "models/car",
        speed: 17,
        radius: 2.5,
    },
    bus: {
        url: "models/bus",
        speed: 14,
        radius: 3,
    },
    train: {
        url: "models/train",
        speed: 17,
        radius: 3,
    },
    cyclist: {
        url: "models/cyclist",
        radius: 1.5,
        speed: 4,
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
                type: "operation",
                identifier: "follow",
                astId,
                children: [targetId, offsetX, offsetY, offsetZ].map((value) => ({ type: "raw", value })),
            }

            if (target == null) {
                return next(
                    entity,
                    {
                        type: "operation",
                        astId,
                        identifier: "wait",
                        children: [{ type: "raw", value: 0.01 }],
                    },
                    nextFollowTransformation
                )
            }

            const lastKeyframe = entity.keyframes[entity.keyframes.length - 1]
            const currentTime = lastKeyframe.t
            const speed = lastKeyframe.speed

            const index = getKeyframeIndex(target.keyframes, currentTime, 0)

            if (index == null) {
                return next(
                    entity,
                    {
                        type: "operation",
                        astId,
                        identifier: "wait",
                        children: [{ type: "raw", value: 0.01 }],
                    },
                    nextFollowTransformation
                )
            }

            getEntityPositionAt(target.keyframes, currentTime, index, positionHelper)
            getEntityRotationAt(target.keyframes, currentTime, index, quaternionHelper)
            entity.keyframes.push({
                astId,
                speed,
                t: currentTime + 0.01,
                position: [positionHelper.x + offsetX, positionHelper.y + offsetY, positionHelper.z + offsetZ],
                rotation: quaternionHelper.toArray() as Vector4Tuple,
            })

            //add all missing keyframes to this target with a very small delay (+ 0.01) and with the astId
            for (const keyframe of target.keyframes) {
                if (keyframe.t < currentTime) {
                    continue
                }
                entity.keyframes.push({
                    astId,
                    speed,
                    t: keyframe.t + 0.01,
                    position: [
                        keyframe.position[0] + offsetX,
                        keyframe.position[1] + offsetY,
                        keyframe.position[2] + offsetZ,
                    ],
                    rotation: keyframe.rotation,
                })
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
                rotation: computeRotationFromKeyframes(position, nextPosition),
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
            const { x, y, z } = randomPointOn(
                queue,
                type,
                entity.radius,
                seed + entity.keyframes[entity.keyframes.length - 1].t
            )
            return next({ x, y, z })
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
            { x, y, z }: { x: number; y: number; z: number }
        ) => {
            const keyframe = entity.keyframes[entity.keyframes.length - 1]
            const path = findPathTo(queue, type, entity.radius, keyframe, x, y, z)
            if (path != null) {
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
            return next(entity, { type: "operation", identifier: "wait", astId, children: [{ type: "raw", value: 1 }] })
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
            { x, y, z }: { x: number; y: number; z: number }
        ) => {
            const keyframe = entity.keyframes[entity.keyframes.length - 1]
            vectorHelper1.set(...keyframe.position)
            let path = findPathTo(queue, type, entity.radius, keyframe, x, y, z)
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
            return next(entity, { type: "operation", identifier: "wait", astId, children: [{ type: "raw", value: 1 }] })
        },
        includeQueue: true,
        includeThis: true,
    },
    spawnOn: {
        defaultParameters: [],
        execute: (next, astId, seed, entity: MotionEntity, queue: Queue, type = "street", amount = 1) => {
            const keyframe = entity.keyframes[entity.keyframes.length - 1]
            return next(
                new Array(amount).fill(null).map<MotionEntity>((_, i) => ({
                    keyframes: [
                        {
                            position: randomPointOn(queue, type, entity.radius, seed + i + keyframe.t).toArray(),
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
                rotation: computeRotationFromKeyframes(position, nextPosition),
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
            const { position, t, speed } = entity.keyframes[entity.keyframes.length - 1]
            let dx = targetX - position[0]
            let dy = targetY - position[1]
            let dz = targetZ - position[2]
            const fullDistanceLength = distanceTo(dx, dy, dz)
            const stepDistance = Math.min(TIME_STEP * speed, fullDistanceLength)
            //normalise and apply the step size
            if (fullDistanceLength === 0) {
                dx = 0
                dy = 0
                dz = 0
            } else {
                dx = (dx / fullDistanceLength) * stepDistance
                dy = (dy / fullDistanceLength) * stepDistance
                dz = (dz / fullDistanceLength) * stepDistance
            }

            const newX = position[0] + dx
            const newY = position[1] + dy
            const newZ = position[2] + dz

            let nextX = position[0],
                nextY = position[1],
                nextZ = position[2]
            const nextT = t + Math.max(0.01, stepDistance / speed)
            if (
                !isColliding(
                    entity,
                    queue.list.map(({ value: { raw } }) => raw).concat(queue.results.map(({ raw }) => raw)),
                    positionHelper.set(newX, newY, newZ),
                    nextT
                )
            ) {
                //not collide
                nextX = newX
                nextY = newY
                nextZ = newZ
            }

            const nextPosition: Vector3Tuple = [nextX, nextY, nextZ]

            entity.keyframes.push({
                position: nextPosition,
                rotation: computeRotationFromKeyframes(position, nextPosition),
                t: nextT,
                astId,
                speed,
            })

            if (fullDistanceLength <= stepDistance) {
                return next(entity) //done
            }
            return next(entity, {
                type: "precomputedOperation",
                identifier: "moveToAndDodge",
                parameters: [targetX, targetY, targetZ],
                astId,
            }) //schedule again
        },
    },
}

const targetEntityPositionHelper = new Vector3()

function isColliding(entity: MotionEntity, environment: Array<any>, position: Vector3, time: number) {
    for (const value of environment) {
        if (value != entity && isMotionEntity(value)) {
            const index = getKeyframeIndex(value.keyframes, time, TIME_STEP + 0.001)
            if (index == null) {
                continue
            }
            getEntityPositionAt(value.keyframes, time, index, targetEntityPositionHelper)
            const distance = position.distanceTo(targetEntityPositionHelper)
            if (distance < value.radius + entity.radius) {
                return true
            }
        }
    }
    return false
}

const defaultRotation: Vector4Tuple = [1, 0, 0, 0]

const vectorHelper1 = new Vector3()
const vectorHelper2 = new Vector3()
const quaternionHelper = new Quaternion()

const ZAXIS = new Vector3(0, 0, 1)

function computeRotationFromKeyframes(p1: Vector3Tuple, p2: Vector3Tuple) {
    vectorHelper1.set(...p1)
    vectorHelper2.set(...p2)
    vectorHelper2.sub(vectorHelper1)
    vectorHelper2.normalize()
    quaternionHelper.setFromUnitVectors(ZAXIS, vectorHelper2)
    return quaternionHelper.toArray() as Vector4Tuple
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
