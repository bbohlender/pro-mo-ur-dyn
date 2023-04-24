import { NestedPrecomputedOperation } from "../../index.js"
import { InterpreterOptions, OperationNextCallback, Operations } from "../../interpreter/index.js"

const TIME_STEP = 100 //ms
const RADIUS = 0.1 //meter

export const operations: Operations = {
    moveTo: {
        defaultParameters: [],
        includeThis: true,
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
        execute: (next, astId, entity: MotionEntity, t: number) => {
            entity.keyframes[entity.keyframes.length - 1].t += t
            return next(entity)
        },
        includeThis: true,
    },
    clone: {
        defaultParameters: [],
        execute: (next, astId, entity: MotionEntity, a: number) => {
            return next(new Array(a).fill(null).map(() => structuredClone(entity)))
        },
        includeThis: true,
    },
    wait: {
        defaultParameters: [],
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
        execute: (
            next: OperationNextCallback,
            astId: string,
            entity: MotionEntity,
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
            const timeRatio = timeStep / dt
            const newX = x + dx * timeRatio
            const newY = y + dy * timeRatio
            const newZ = z + dz * timeRatio

            let nextX = x,
                nextY = y,
                nextZ = z
            if (true) {
                //TODO: check collide
                //not collide
                nextX = newX
                nextY = newY
                nextZ = newZ
            }
            entity.keyframes.push({ x: nextX, y: nextY, z: nextZ, t: t + timeStep, astId })

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

export function comparePriority(e1: unknown, e2: unknown, e1Trans: unknown, e2Trans: unknown) {
    if (!isMotionEntity(e1) || !isMotionEntity(e2)) {
        return 0
    }
    let addedCurrTime = 0
    let addedListItemTime = 0
    if (isNestedPrecomputedOperation(e1Trans)) {
        const oper = e1Trans as NestedPrecomputedOperation
        addedCurrTime = oper.parameters[3]
    }
    if (isNestedPrecomputedOperation(e2Trans)) {
        const oper = e2Trans as NestedPrecomputedOperation
        addedListItemTime = oper.parameters[3]
    }
    return (
        e1.keyframes[e1.keyframes.length - 1]!.t +
        addedCurrTime -
        (e2.keyframes[e2.keyframes.length - 1]!.t + addedListItemTime)
    )
}

export function createMotionEntitiy({ type, x, y, z, time }: any, astId: string): MotionEntity {
    const retval = {
        type: motionEntityTypeMap[type as keyof typeof motionEntityTypeMap] ?? MotionEntityType.Pedestrian,
        keyframes: [{ x: x ?? 0, y: y ?? 0, z: z ?? 0, t: time ?? 0, astId }],
    }
    return retval
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
    type: MotionEntityType
    keyframes: Array<Keyframe>
}

export type Keyframe = {
    x: number
    y: number
    z: number
    t: number
    astId: string
}

export function isMotionEntity(value: unknown): value is MotionEntity {
    return typeof value === "object" && value != null && "keyframes" in value
}

function isNestedPrecomputedOperation(value: unknown): value is NestedPrecomputedOperation {
    return (
        typeof value === "object" &&
        !Array.isArray(value) &&
        value !== null &&
        "type" in value &&
        value.type == "precomputedOperation"
    )
}
export * from "./helper.js"
export * from "./exporter.js"
