import { NestedPrecomputedOperation } from "../../index.js"
import { InterpreterOptions, OperationNextCallback, Operations } from "../../interpreter/index.js"

const TIME_STEP = 100 //ms
const RADIUS = 0.1 //meter

export const operations: Operations = {
    moveTo: {
        defaultParameters: [],
        includeThis: true,
        execute: (next: OperationNextCallback, entity: MotionEntity, x: number, y: number, z: number, dt: number) => {
            const t = entity.keyframes[entity.keyframes.length - 1]![3]
            entity.keyframes.push([x, y, z, t + dt])
            return next(entity)
        },
    },
    moveBy: {
        defaultParameters: [],
        includeThis: true,
        execute: (
            next: OperationNextCallback,
            entity: MotionEntity,
            dx: number,
            dy: number,
            dz: number,
            dt: number
        ) => {
            const [x, y, z, t] = entity.keyframes[entity.keyframes.length - 1]!
            entity.keyframes.push([x + dx, y + dy, z + dz, t + dt])
            return next(entity)
        },
    },
    moveToAndDodge: {
        defaultParameters: [],
        includeThis: true,
        execute: (
            next: OperationNextCallback,
            entity: MotionEntity,
            targetX: number,
            targetY: number,
            targetZ: number,
            dt: number
        ) => {
            const [x, y, z, t] = entity.keyframes.at(-1)!
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
            entity.keyframes.push([nextX, nextY, nextZ, t + timeStep])

            if (dt <= TIME_STEP) {
                return next(entity) //done
            }
            return next(entity, {
                type: "precomputedOperation",
                identifier: "moveToAndDodge",
                parameters: [targetX, targetY, targetZ, dt - timeStep],
            }) //schedule again
            //TODO: somehow get the id from the transformation to here
        },
    },
}

export const interpreterOptions: InterpreterOptions = {
    cloneValue(value) {
        if (isMotionEntity(value)) {
            return { keyframes: [...value.keyframes], type: value.type }
        }
    },
    comparePriority(e1, e2, e1Trans, e2Trans) {
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
            e1.keyframes[e1.keyframes.length - 1]![3] +
            addedCurrTime -
            (e2.keyframes[e2.keyframes.length - 1]![3] + addedListItemTime)
        )
    },
    computeDurationMS: 1000,
    createValue({ type, x, y, z, time }) {
        return {
            type: motionEntityTypeMap[type as keyof typeof motionEntityTypeMap] ?? MotionEntityType.Pedestrian,
            keyframes: [[x ?? 0, y ?? 0, z ?? 0, time ?? 0]],
        }
    },
    getComputeProgress(entity) {
        if (!isMotionEntity(entity)) {
            return 0
        }
        return entity.keyframes[entity.keyframes.length - 1][3]
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
    keyframes: Array<readonly [number, number, number, number]> //3D + Time
}

function isMotionEntity(value: unknown): value is MotionEntity {
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
