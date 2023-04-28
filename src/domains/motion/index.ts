import { Vector3 } from "three"
import { InterpreterOptions, OperationNextCallback, Operations } from "../../interpreter/index.js"
import { getEntityPositionAt, getKeyframeIndex } from "./helper.js"
import { isPathway, pathwaysToGeometry } from "../pathway/index.js"
import { Queue } from "../../interpreter/queue.js"
import { sampleGeometry } from "../sample.js"
import { findPathTo } from "./pathfinding.js"

const TIME_STEP = 0.1 //ms

export const entityTypeDefaults = {
    pedestrian: {
        url: "models/human",
        radius: 0.5,
    },
    car: {
        url: "models/car",
        radius: 2.5,
    },
    bus: {
        url: "models/bus",
        radius: 5,
    },
    train: {
        url: "models/train",
        radius: 8,
    },
    //cyclist: {},
}

const positionHelper = new Vector3()

export const operations: Operations = {
    moveTo: {
        defaultParameters: [],
        includeThis: true,
        includeQueue: false,
        execute: (
            next: OperationNextCallback,
            astId: string,
            entity: MotionEntity,
            x: number,
            y: number,
            z: number,
            dt: number
        ) => {
            const { t } = entity.keyframes[entity.keyframes.length - 1]
            entity.keyframes.push({ x, y, z, t: t + dt, astId })
            return next(entity)
        },
    },
    later: {
        defaultParameters: [],
        includeQueue: false,
        execute: (next, astId, entity: MotionEntity, t: number) => {
            entity.keyframes[entity.keyframes.length - 1].t += t
            return next(entity)
        },
        includeThis: true,
    },
    clone: {
        defaultParameters: [],
        includeQueue: false,
        execute: (next, astId, entity: MotionEntity, amount: number) => {
            return next(new Array(amount).fill(null).map(() => structuredClone(entity)))
        },
        includeThis: true,
    },
    randomPointOn: {
        defaultParameters: [],
        execute: (next, astId, queue: Queue, type: string) => {
            const geometry = queue.getCached(type, (results) =>
                pathwaysToGeometry(results.map(({ raw }) => raw).filter(isPathway), type)
            )
            if (geometry == null) {
                return next(null)
            }
            const [{ x, y, z }] = sampleGeometry(geometry, 1)
            return next({ x, y, z })
        },
        includeQueue: true,
        includeThis: false,
    },
    pathOnTo: {
        defaultParameters: [],
        execute: (
            next,
            astId,
            entity: MotionEntity,
            queue: Queue,
            type: string,
            { x, y, z }: { x: number; y: number; z: number }
        ) => {
            const path = findPathTo(queue, type, entity.keyframes[entity.keyframes.length - 1], x, y, z)
            if (path != null) {
                let t = entity.keyframes[entity.keyframes.length - 1].t
                for (const { x, y, z } of path) {
                    t += 1
                    entity.keyframes.push({ astId, x, y, z, t })
                }
            }
            return next(entity)
        },
        includeQueue: true,
        includeThis: true,
    },
    spawnOn: {
        defaultParameters: [],
        execute: (next, astId, entity: MotionEntity, queue: Queue, type = "street", amount = 1) => {
            const pathwayGeometry = queue.getCached(type, (results) =>
                pathwaysToGeometry(results.map(({ raw }) => raw).filter(isPathway), type)
            )
            if (pathwayGeometry == null) {
                return next([])
            }
            return next(
                sampleGeometry(pathwayGeometry, amount).map<MotionEntity>(({ x, y, z }) => ({
                    keyframes: [
                        {
                            x,
                            y,
                            z,
                            astId,
                            t: entity.keyframes[entity.keyframes.length - 1].t,
                        },
                    ],
                    radius: entity.radius,
                    url: entity.url,
                }))
            )
        },
        includeQueue: true,
        includeThis: true,
    },
    wait: {
        defaultParameters: [],
        includeQueue: false,
        execute: (next, astId, entity: MotionEntity, t: number) => {
            const { x, y, z, t: oldT } = entity.keyframes[entity.keyframes.length - 1]
            entity.keyframes.push({
                astId,
                x,
                y,
                z,
                t: oldT + t,
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
            entity: MotionEntity,
            dx: number,
            dy: number,
            dz: number,
            dt: number
        ) => {
            const { x, y, z, t } = entity.keyframes[entity.keyframes.length - 1]
            entity.keyframes.push({ x: x + dx, y: y + dy, z: z + dz, t: t + dt, astId })
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
            entity: MotionEntity,
            queue: Queue,
            targetX: number,
            targetY: number,
            targetZ: number,
            dt: number
        ) => {
            const { x, y, z, t } = entity.keyframes[entity.keyframes.length - 1]
            const timeStep = Math.min(dt, TIME_STEP)
            const dx = targetX - x
            const dy = targetY - y
            const dz = targetZ - z
            const stepsLeft = dt / timeStep
            const newX = x + dx / stepsLeft
            const newY = y + dy / stepsLeft
            const newZ = z + dz / stepsLeft

            let nextX = x,
                nextY = y,
                nextZ = z
            const nextT = t + timeStep
            if (
                !isColliding(
                    queue.list.map(({ value: { raw } }) => raw).concat(queue.results.map(({ raw }) => raw)),
                    entity.radius,
                    positionHelper.set(newX, newY, newZ),
                    nextT
                )
            ) {
                //not collide
                nextX = newX
                nextY = newY
                nextZ = newZ
            }
            entity.keyframes.push({ x: nextX, y: nextY, z: nextZ, t: nextT, astId })

            if (dt <= TIME_STEP) {
                return next(entity) //done
            }
            return next(entity, {
                type: "precomputedOperation",
                identifier: "moveToAndDodge",
                parameters: [targetX, targetY, targetZ, dt - timeStep],
                astId,
            }) //schedule again
        },
    },
}

const targetEntityPositionHelper = new Vector3()

function isColliding(environment: Array<any>, radius: number, position: Vector3, time: number) {
    for (const value of environment) {
        if (isMotionEntity(value)) {
            const index = getKeyframeIndex(value.keyframes, time, TIME_STEP + 0.001)
            if (index == null) {
                continue
            }
            getEntityPositionAt(value.keyframes, time, index, targetEntityPositionHelper)
            const distance = position.distanceTo(targetEntityPositionHelper)
            if (distance < value.radius + radius) {
                return true
            }
        }
    }
    return false
}

export function compareMotionEntityPriority(e1: MotionEntity, e2: MotionEntity) {
    const e1Time = e1.keyframes[e1.keyframes.length - 1].t
    const e2Time = e2.keyframes[e2.keyframes.length - 1].t
    return e2Time - e1Time
}

export function createMotionEntitiy({ type, x, y, z, time }: any, astId: string): MotionEntity {
    const defaults = entityTypeDefaults[(type ?? "pedestrian") as keyof typeof entityTypeDefaults]
    if (defaults == null) {
        throw new Error(`unknown type "${type}"`)
    }
    return {
        keyframes: [{ x: x ?? 0, y: y ?? 0, z: z ?? 0, t: time ?? 0, astId }],
        radius: defaults.radius,
        url: defaults.url,
    }
}

export function getMotionEntityProgress(entity: MotionEntity) {
    return entity.keyframes[entity.keyframes.length - 1].t
}

export enum MotionEntityType {
    Car,
    Pedestrian,
    Cyclist,
}

const motionEntityTypeMap = {
    car: MotionEntityType.Car,
    cylcist: MotionEntityType.Cyclist,
    predestrian: MotionEntityType.Pedestrian,
}

export type MotionEntity = {
    keyframes: Array<Keyframe>
    url: string
    radius: number
}

export type Keyframe = {
    x: number
    y: number
    z: number
    t: number
    astId: string
    //speed: number
}

export function isMotionEntity(value: unknown): value is MotionEntity {
    return typeof value === "object" && value != null && "keyframes" in value
}

export * from "./helper.js"
export * from "./exporter.js"
