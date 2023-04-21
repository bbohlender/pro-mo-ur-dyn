import { InterpreterOptions, OperationNextCallback, Operations } from "../../interpreter/index.js"

const TIME_STEP = 100 //ms
const RADIUS = 0.1 //meter

const operations: Operations = {
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

export const interpreterOptions: InterpreterOptions = {
    cloneValue(value) {
        if (isMotionEntity(value)) {
            return { keyframes: [...value.keyframes], type: value.type }
        }
        return value
    },
    comparePriority(e1, e2) {
        if (!isMotionEntity(e1) || !isMotionEntity(e2)) {
            return 0
        }
        const e1Time = e1.keyframes[e1.keyframes.length - 1].t
        const e2Time = e2.keyframes[e2.keyframes.length - 1].t
        return e2Time - e1Time
    },
    computeDurationMS: 1000,
    createValue({ type, x, y, z, time }, astId): MotionEntity {
        return {
            type: motionEntityTypeMap[type as keyof typeof motionEntityTypeMap] ?? MotionEntityType.Pedestrian,
            keyframes: [{ x: x ?? 0, y: y ?? 0, z: z ?? 0, t: time ?? 0, astId }],
        }
    },
    getComputeProgress(entity) {
        if (!isMotionEntity(entity)) {
            return 0
        }
        return entity.keyframes[entity.keyframes.length - 1].t
    },
    operations,
    shouldInterrrupt(startProgress, currentProgress) {
        return currentProgress - startProgress > 1000 //interrupt every second
    },
    shouldWait(p) {
        return p > 10000 //only computes the first 10 second
    },
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

export * from "./helper.js"
